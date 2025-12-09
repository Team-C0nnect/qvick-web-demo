import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { patchNoteService } from '../services/patchnote.service';
import { aiRefineService } from '../services/ai-refine.service';
import { CATEGORY_CONFIG, VISIBILITY_CONFIG } from '../types/patchnote';
import type { PatchNote, PatchNoteCategory, PatchNoteVisibility, PatchNoteImage, CreatePatchNoteRequest, UpdatePatchNoteRequest } from '../types/patchnote';
import type { MyUserResponse } from '../types/api';
import apiClient from '../lib/api-client';
import '../styles/PatchNoteAdmin.css';

type ViewMode = 'list' | 'create' | 'edit' | 'preview';
type FilterStatus = 'all' | 'draft' | 'published';

export default function PatchNoteAdmin() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedNote, setSelectedNote] = useState<PatchNote | null>(null);
  const [patchNotes, setPatchNotes] = useState<PatchNote[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  
  // 폼 상태
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [version, setVersion] = useState('');
  const [category, setCategory] = useState<PatchNoteCategory>('feature');
  const [visibility, setVisibility] = useState<PatchNoteVisibility>('public');
  const [images, setImages] = useState<PatchNoteImage[]>([]);
  
  // AI 다듬기 상태
  const [isRefining, setIsRefining] = useState(false);
  const [, setRefineSuggestions] = useState<string[]>([]);
  
  // 이미지 업로드 ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 저장 상태
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // 통계 상태
  const [statusCounts, setStatusCounts] = useState<{ draft: number; published: number }>({ draft: 0, published: 0 });

  // 현재 사용자 정보
  const { data: user } = useQuery<MyUserResponse>({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      const response = await apiClient.get<MyUserResponse>('/users/my');
      return response.data;
    },
  });

  // Admin 체크
  const isAdmin = user?.roles?.includes('ADMIN');

  useEffect(() => {
    if (user && !isAdmin) {
      alert('접근 권한이 없습니다.');
      navigate('/');
    }
  }, [user, isAdmin, navigate]);

  // 패치노트 목록 로드
  useEffect(() => {
    loadPatchNotes();
  }, []);

  const loadPatchNotes = async () => {
    setIsLoadingNotes(true);
    try {
      const [notes, counts] = await Promise.all([
        patchNoteService.getAllPatchNotes(),
        patchNoteService.getStatusCounts(),
      ]);
      setPatchNotes(notes);
      setStatusCounts(counts);
    } catch (error) {
      console.error('패치노트 로드 실패:', error);
    } finally {
      setIsLoadingNotes(false);
    }
  };

  // 필터링된 목록
  const filteredNotes = patchNotes.filter((note) => {
    if (filterStatus === 'all') return true;
    return note.status === filterStatus;
  });

  // 폼 초기화
  const resetForm = () => {
    setTitle('');
    setContent('');
    setVersion('');
    setCategory('feature');
    setVisibility('public');
    setImages([]);
    setSelectedNote(null);
    setLastSaved(null);
    setRefineSuggestions([]);
  };

  // 새 패치노트 작성
  const handleCreate = () => {
    resetForm();
    setViewMode('create');
  };

  // 패치노트 수정
  const handleEdit = (note: PatchNote) => {
    setSelectedNote(note);
    setTitle(note.title);
    setContent(note.content);
    setVersion(note.version);
    setCategory(note.category);
    setVisibility(note.visibility || 'public');
    setImages(note.images || []);
    setRefineSuggestions([]);
    setViewMode('edit');
  };

  // 미리보기
  const handlePreview = (note: PatchNote) => {
    setSelectedNote(note);
    setViewMode('preview');
  };

  // 임시 저장
  const handleSave = async () => {
    if (!title.trim() || !version.trim()) {
      alert('제목과 버전을 입력해주세요.');
      return;
    }

    setIsSaving(true);

    try {
      if (viewMode === 'create') {
        const request: CreatePatchNoteRequest = {
          title,
          content,
          version,
          category,
          visibility,
          images,
        };
        const newNote = await patchNoteService.createPatchNote(request, user?.name || 'Unknown');
        setSelectedNote(newNote);
        setViewMode('edit');
      } else if (viewMode === 'edit' && selectedNote) {
        const request: UpdatePatchNoteRequest = {
          title,
          content,
          version,
          category,
          visibility,
          images,
        };
        await patchNoteService.updatePatchNote(selectedNote.id, request);
      }

      setLastSaved(new Date());
      await loadPatchNotes();
    } finally {
      setIsSaving(false);
    }
  };

  // AI 다듬기
  const handleAIRefine = async () => {
    if (!title.trim() && !content.trim()) {
      alert('다듬을 내용이 없습니다. 제목이나 내용을 입력해주세요.');
      return;
    }

    setIsRefining(true);
    setRefineSuggestions([]);

    try {
      const result = await aiRefineService.refinePatchNote(version, title, content, images);
      setTitle(result.title);
      setContent(result.content);
      setRefineSuggestions(result.suggestions);
    } catch (error) {
      console.error('AI 다듬기 실패:', error);
      alert('AI 다듬기에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsRefining(false);
    }
  };

  // 이미지 업로드
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // 파일 크기 체크 (5MB 제한)
    if (file.size > 5 * 1024 * 1024) {
      alert('이미지 크기는 5MB 이하여야 합니다.');
      return;
    }

    // 이미지 파일 타입 체크
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    try {
      const imageUrl = await patchNoteService.uploadImage(file);
      const newImage: PatchNoteImage = {
        id: `img_${Date.now()}`,
        url: imageUrl,
        alt: file.name.replace(/\.[^/.]+$/, ''),
      };
      setImages([...images, newImage]);
      
      // 에디터에 이미지 마크다운 추가
      const imageMarkdown = `\n![${newImage.alt}](${newImage.id})\n`;
      setContent(prev => prev + imageMarkdown);
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      alert('이미지 업로드에 실패했습니다.');
    }

    // 파일 input 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 이미지 삭제
  const handleImageDelete = (imageId: string) => {
    setImages(images.filter(img => img.id !== imageId));
    // 에디터에서 해당 이미지 마크다운 제거
    setContent(prev => prev.replace(new RegExp(`\\n?!\\[.*?\\]\\(${imageId}\\)\\n?`, 'g'), '\n'));
  };

  // 발행
  const handlePublish = async () => {
    if (!selectedNote) return;
    
    if (!confirm('패치노트를 발행하시겠습니까? 발행 후에도 수정이 가능합니다.')) return;

    await patchNoteService.publishPatchNote(selectedNote.id);
    await loadPatchNotes();
    setViewMode('list');
    resetForm();
  };

  // 발행 취소
  const handleUnpublish = async (note: PatchNote) => {
    if (!confirm('발행을 취소하시겠습니까?')) return;
    
    await patchNoteService.unpublishPatchNote(note.id);
    await loadPatchNotes();
  };

  // 삭제
  const handleDelete = async (note: PatchNote) => {
    if (!confirm(`"${note.title}" 패치노트를 삭제하시겠습니까?`)) return;
    
    await patchNoteService.deletePatchNote(note.id);
    await loadPatchNotes();
    
    if (selectedNote?.id === note.id) {
      resetForm();
      setViewMode('list');
    }
  };

  // 목록으로 돌아가기
  const handleBack = () => {
    setViewMode('list');
    resetForm();
  };

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 간단한 Markdown 렌더링 (기본적인 것만)
  const renderMarkdown = (md: string, noteImages?: PatchNoteImage[]) => {
    let html = md;
    
    // 이미지 마크다운을 실제 이미지로 변환
    const imageList = noteImages || images;
    imageList.forEach(img => {
      const imgRegex = new RegExp(`!\\[([^\\]]*)\\]\\(${img.id}\\)`, 'g');
      html = html.replace(imgRegex, `<img src="${img.url}" alt="$1" class="markdown-image" />`);
    });
    
    // 연속된 리스트 항목을 먼저 처리
    const lines = html.split('\n');
    const processedLines: string[] = [];
    let inList = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isListItem = /^- (.*)$/.test(line.trim());
      
      if (isListItem) {
        if (!inList) {
          processedLines.push('<ul>');
          inList = true;
        }
        let content = line.trim().replace(/^- (.*)$/, '$1');
        // 리스트 내부의 링크와 강조 처리
        content = content
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/`(.*?)`/g, '<code>$1</code>')
          .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        processedLines.push(`<li>${content}</li>`);
      } else {
        if (inList) {
          processedLines.push('</ul>');
          inList = false;
        }
        processedLines.push(line);
      }
    }
    if (inList) {
      processedLines.push('</ul>');
    }
    
    html = processedLines.join('\n');
    
    // 헤더와 외부 이미지를 먼저 처리
    html = html
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/!\[(.*?)\]\((https?:\/\/[^)]+)\)/g, '<img src="$2" alt="$1" class="markdown-image" />');
    
    // 리스트가 아닌 부분의 마크다운 처리 (라인별로)
    const finalLines = html.split('\n').map(line => {
      // ul, li, /ul 태그가 있는 라인은 이미 처리됨
      if (line.includes('<ul>') || line.includes('</ul>') || line.includes('<li>')) {
        return line;
      }
      // 나머지 라인 처리
      return line
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    });
    
    html = finalLines.join('\n');
    
    // 빈 줄을 단락으로 변환
    html = html
      .replace(/\n\n+/g, '</p><p>')
      .replace(/(?<!<\/li>)\n(?!<)/g, '<br/>');
    
    // ul 태그 주변의 불필요한 br 제거
    html = html
      .replace(/<br\/?>\s*<ul>/g, '<ul>')
      .replace(/<\/ul>\s*<br\/?>/g, '</ul>')
      .replace(/<br\/?>\s*<\/ul>/g, '</ul>')
      .replace(/<ul>\s*<br\/?>/g, '<ul>');
    
    return `<div>${html}</div>`;
  };

  if (!isAdmin) {
    return (
      <div className="patchnote-admin-page">
        <div className="patchnote-loading">권한을 확인하는 중...</div>
      </div>
    );
  }

  return (
    <div className="patchnote-admin-page">
      {/* 헤더 */}
      <div className="patchnote-admin-header">
        <div className="header-left">
          {viewMode !== 'list' && (
            <button className="back-btn" onClick={handleBack}>
              ← 목록으로
            </button>
          )}
          <h1 className="page-title">
            {viewMode === 'list' && '패치노트 관리'}
            {viewMode === 'create' && '새 패치노트 작성'}
            {viewMode === 'edit' && '패치노트 수정'}
            {viewMode === 'preview' && '미리보기'}
          </h1>
        </div>
        <div className="header-right">
          {viewMode === 'list' && (
            <button className="create-btn" onClick={handleCreate}>
              + 새 패치노트
            </button>
          )}
          {(viewMode === 'create' || viewMode === 'edit') && (
            <>
              {lastSaved && (
                <span className="last-saved">
                  마지막 저장: {lastSaved.toLocaleTimeString('ko-KR')}
                </span>
              )}
              <button 
                className="save-btn" 
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? '저장 중...' : '임시 저장'}
              </button>
              {viewMode === 'edit' && selectedNote && (
                <button 
                  className="publish-btn" 
                  onClick={handlePublish}
                  disabled={selectedNote.status === 'published'}
                >
                  {selectedNote.status === 'published' ? '발행됨' : '발행하기'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 목록 보기 */}
      {viewMode === 'list' && (
        <div className="patchnote-list-view">
          {/* 통계 */}
          <div className="stats-bar">
            <div className="stat-item">
              <span className="stat-label">전체</span>
              <span className="stat-value">{patchNotes.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">초안</span>
              <span className="stat-value draft">{statusCounts.draft}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">발행됨</span>
              <span className="stat-value published">{statusCounts.published}</span>
            </div>
          </div>

          {/* 필터 */}
          <div className="filter-bar">
            <button 
              className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              전체
            </button>
            <button 
              className={`filter-btn ${filterStatus === 'draft' ? 'active' : ''}`}
              onClick={() => setFilterStatus('draft')}
            >
              초안
            </button>
            <button 
              className={`filter-btn ${filterStatus === 'published' ? 'active' : ''}`}
              onClick={() => setFilterStatus('published')}
            >
              발행됨
            </button>
          </div>

          {/* 목록 */}
          {isLoadingNotes ? (
            <div className="patchnote-list">
              {[1, 2, 3].map((i) => (
                <div key={i} className="patchnote-item skeleton-item">
                  <div className="item-header">
                    <div className="skeleton" style={{ width: 80, height: 24, borderRadius: 6 }}></div>
                    <div className="skeleton" style={{ width: 60, height: 24, borderRadius: 6 }}></div>
                    <div className="skeleton" style={{ width: 70, height: 24, borderRadius: 6 }}></div>
                  </div>
                  <div className="item-content">
                    <div className="skeleton" style={{ width: '70%', height: 24, marginBottom: 8 }}></div>
                    <div className="skeleton" style={{ width: '90%', height: 16, marginBottom: 12 }}></div>
                    <div className="skeleton" style={{ width: 120, height: 14 }}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <h3>패치노트가 없습니다</h3>
              <p>새 패치노트를 작성해보세요.</p>
              <button className="create-btn" onClick={handleCreate}>
                + 새 패치노트 작성
              </button>
            </div>
          ) : (
            <div className="patchnote-list">
              {filteredNotes.map((note) => (
                <div key={note.id} className={`patchnote-item ${note.status}`}>
                  <div className="item-header">
                    <span 
                      className="category-badge"
                      style={{ 
                        color: CATEGORY_CONFIG[note.category].color,
                        backgroundColor: CATEGORY_CONFIG[note.category].bgColor,
                      }}
                    >
                      {CATEGORY_CONFIG[note.category].label}
                    </span>
                    <span className={`status-badge ${note.status}`}>
                      {note.status === 'draft' ? '초안' : '발행됨'}
                    </span>
                    <span className={`visibility-badge ${note.visibility || 'public'}`}>
                      {VISIBILITY_CONFIG[note.visibility || 'public'].label}
                    </span>
                  </div>
                  <div className="item-content">
                    <h3 className="item-title">
                      <span className="version-tag">v{note.version}</span>
                      {note.title}
                    </h3>
                    <p className="item-meta">
                      {note.author} · {formatDate(note.updatedAt)}
                    </p>
                  </div>
                  <div className="item-actions">
                    <button className="action-btn preview" onClick={() => handlePreview(note)}>
                      미리보기
                    </button>
                    <button className="action-btn edit" onClick={() => handleEdit(note)}>
                      수정
                    </button>
                    {note.status === 'published' ? (
                      <button className="action-btn unpublish" onClick={() => handleUnpublish(note)}>
                        발행 취소
                      </button>
                    ) : (
                      <button className="action-btn delete" onClick={() => handleDelete(note)}>
                        삭제
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 작성/수정 보기 */}
      {(viewMode === 'create' || viewMode === 'edit') && (
        <div className="patchnote-editor-view">
          <div className="editor-sidebar">
            <div className="form-group">
              <label>버전</label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="예: 1.0.0"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>카테고리</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as PatchNoteCategory)}
                className="form-select"
              >
                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>공개 대상</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as PatchNoteVisibility)}
                className="form-select"
              >
                {Object.entries(VISIBILITY_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
              <p className="form-hint">
                {VISIBILITY_CONFIG[visibility].description}
              </p>
            </div>
            
            {/* 이미지 업로드 */}
            <div className="form-group">
              <label>이미지</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="form-file-input"
                id="image-upload"
              />
              <label htmlFor="image-upload" className="file-upload-btn">
                📷 이미지 추가
              </label>
              {images.length > 0 && (
                <div className="image-list">
                  {images.map((img) => (
                    <div key={img.id} className="image-item">
                      <img src={img.url} alt={img.alt} className="image-thumbnail" />
                      <span className="image-name">{img.alt}</span>
                      <button
                        className="image-delete-btn"
                        onClick={() => handleImageDelete(img.id)}
                        title="이미지 삭제"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI 다듬기 */}
            <div className="form-group">
              <button
                className={`ai-refine-btn ${isRefining ? 'refining' : ''}`}
                onClick={handleAIRefine}
                disabled={isRefining}
              >
                {isRefining ? (
                  <>
                    <span className="spinner"></span>
                    AI 다듬는 중...
                  </>
                ) : (
                  <>
                    ✨ AI로 다듬기
                  </>
                )}
              </button>
            </div>

            {viewMode === 'edit' && selectedNote && (
              <div className="editor-info">
                <p><strong>상태:</strong> {selectedNote.status === 'draft' ? '초안' : '발행됨'}</p>
                <p><strong>생성일:</strong> {formatDate(selectedNote.createdAt)}</p>
                {selectedNote.publishedAt && (
                  <p><strong>발행일:</strong> {formatDate(selectedNote.publishedAt)}</p>
                )}
              </div>
            )}
          </div>
          <div className="editor-main">
            <div className="form-group">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="패치노트 제목을 입력하세요"
                className="form-input title-input"
              />
            </div>
            <div className="form-group editor-content">
              <label>내용 (Markdown 지원)</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`## 주요 변경사항

### 새 기능
- 새로운 기능 설명

### 개선사항
- 개선된 내용

### 버그 수정
- 수정된 버그 설명`}
                className="form-textarea"
              />
            </div>
          </div>
          <div className="editor-preview">
            <h4 className="preview-title">미리보기</h4>
            <div className="preview-content">
              <div className="preview-header">
                <span 
                  className="category-badge"
                  style={{ 
                    color: CATEGORY_CONFIG[category].color,
                    backgroundColor: CATEGORY_CONFIG[category].bgColor,
                  }}
                >
                  {CATEGORY_CONFIG[category].label}
                </span>
                <span className="version-tag">v{version || '0.0.0'}</span>
                <span className={`visibility-badge ${visibility}`}>
                  {VISIBILITY_CONFIG[visibility].label}
                </span>
              </div>
              <h2 className="preview-note-title">{title || '제목 없음'}</h2>
              <div 
                className="preview-body"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(content || '*내용을 입력하세요*') }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 미리보기 */}
      {viewMode === 'preview' && selectedNote && (
        <div className="patchnote-preview-view">
          <div className="preview-card">
            <div className="preview-card-header">
              <span 
                className="category-badge large"
                style={{ 
                  color: CATEGORY_CONFIG[selectedNote.category].color,
                  backgroundColor: CATEGORY_CONFIG[selectedNote.category].bgColor,
                }}
              >
                {CATEGORY_CONFIG[selectedNote.category].label}
              </span>
              <span className="version-tag large">v{selectedNote.version}</span>
              <span className={`status-badge ${selectedNote.status}`}>
                {selectedNote.status === 'draft' ? '초안' : '발행됨'}
              </span>
              <span className={`visibility-badge ${selectedNote.visibility || 'public'}`}>
                {VISIBILITY_CONFIG[selectedNote.visibility || 'public'].label}
              </span>
            </div>
            <h1 className="preview-card-title">{selectedNote.title}</h1>
            <p className="preview-card-meta">
              {selectedNote.author} · {formatDate(selectedNote.publishedAt || selectedNote.updatedAt)}
            </p>
            <div 
              className="preview-card-body"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedNote.content, selectedNote.images) }}
            />
            <div className="preview-card-actions">
              <button className="action-btn edit" onClick={() => handleEdit(selectedNote)}>
                수정하기
              </button>
              {selectedNote.status === 'draft' && (
                <button 
                  className="publish-btn" 
                  onClick={async () => {
                    await patchNoteService.publishPatchNote(selectedNote.id);
                    await loadPatchNotes();
                    setViewMode('list');
                  }}
                >
                  발행하기
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
