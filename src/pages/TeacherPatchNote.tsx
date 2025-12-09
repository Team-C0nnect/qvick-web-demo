import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { patchNoteService } from '../services/patchnote.service';
import { CATEGORY_CONFIG } from '../types/patchnote';
import type { PatchNote, PatchNoteImage } from '../types/patchnote';
import '../styles/TeacherPatchNote.css';

export default function TeacherPatchNotePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patchNotes, setPatchNotes] = useState<PatchNote[]>([]);
  const [selectedNote, setSelectedNote] = useState<PatchNote | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPatchNotes = async () => {
      setIsLoading(true);
      try {
        // teacher 전용 패치노트만 가져오기 (teacher visibility만)
        const allNotes = await patchNoteService.getPublishedPatchNotes('teacher');
        // teacher 전용만 필터링
        const teacherOnlyNotes = allNotes.filter(note => note.visibility === 'teacher');
        setPatchNotes(teacherOnlyNotes);
        
        if (id) {
          const note = teacherOnlyNotes.find((n) => n.id === id);
          setSelectedNote(note || null);
        } else if (teacherOnlyNotes.length > 0) {
          setSelectedNote(teacherOnlyNotes[0]);
        }
      } catch (error) {
        console.error('패치노트 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPatchNotes();
  }, [id]);

  const handleSelectNote = (note: PatchNote) => {
    setSelectedNote(note);
    navigate(`/teacher-patchnote/${note.id}`, { replace: true });
  };

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // 간단한 Markdown 렌더링 (이미지 지원 포함)
  const renderMarkdown = (md: string, noteImages?: PatchNoteImage[]) => {
    let html = md;
    
    // 패치노트 이미지를 실제 이미지로 변환
    const imageList = noteImages || [];
    imageList.forEach(img => {
      const imgRegex = new RegExp(`!\\[([^\\]]*)\\]\\(${img.id}\\)`, 'g');
      html = html.replace(imgRegex, `<img src="${img.url}" alt="$1" class="patchnote-image" />`);
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
      .replace(/!\[(.*?)\]\((https?:\/\/[^)]+)\)/g, '<img src="$2" alt="$1" class="patchnote-image" />');
    
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
    
    // 빈 줄을 단락으로 변환 (ul 태그 안에서는 제외)
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

  // 스켈레톤 컴포넌트
  const ContentSkeleton = () => (
    <div className="article-content article-content-skeleton">
      <div className="skeleton skeleton-line title"></div>
      <div className="skeleton skeleton-line long"></div>
      <div className="skeleton skeleton-line medium"></div>
      <div className="skeleton skeleton-line long"></div>
      <div className="skeleton skeleton-line short"></div>
      <div className="skeleton skeleton-line" style={{ marginTop: 24 }}></div>
      <div className="skeleton skeleton-line long"></div>
      <div className="skeleton skeleton-line medium"></div>
    </div>
  );

  return (
    <div className="teacher-patchnote-page">
      {/* 페이지 헤더 */}
      <div className="teacher-patchnote-header">
        <div className="header-info">
          <h1>Teacher Web Page 패치노트</h1>
          <p>Teacher 계정에서만 확인할 수 있는 업데이트 내역입니다.</p>
        </div>
      </div>

      <div className="teacher-patchnote-container">
        {isLoading ? (
          // 전체 로딩 스켈레톤
          <div className="teacher-patchnote-layout">
            <aside className="teacher-patchnote-sidebar">
              <div className="sidebar-header">
                <h2>버전 기록</h2>
                <div className="skeleton" style={{ width: 40, height: 24, borderRadius: 12 }}></div>
              </div>
              <nav className="version-list">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="version-item skeleton-item">
                    <div className="version-item-header">
                      <div className="version-item-header-left">
                        <div className="skeleton" style={{ width: 60, height: 20, borderRadius: 4 }}></div>
                        <div className="skeleton" style={{ width: 12, height: 12, borderRadius: '50%' }}></div>
                      </div>
                      <div className="skeleton" style={{ width: 80, height: 14 }}></div>
                    </div>
                    <div className="skeleton" style={{ width: '85%', height: 16, marginTop: 8 }}></div>
                  </div>
                ))}
              </nav>
            </aside>
            <main className="teacher-patchnote-main">
              <article className="teacher-patchnote-article">
                <div className="article-header">
                  <div className="article-meta">
                    <div className="skeleton" style={{ width: 80, height: 28, borderRadius: 8 }}></div>
                    <div className="skeleton" style={{ width: 60, height: 28, borderRadius: 8 }}></div>
                    <div className="skeleton" style={{ width: 90, height: 28, borderRadius: 8 }}></div>
                  </div>
                  <div className="skeleton" style={{ width: '70%', height: 36, marginBottom: 16 }}></div>
                  <div className="skeleton" style={{ width: 200, height: 16 }}></div>
                </div>
                <ContentSkeleton />
              </article>
            </main>
          </div>
        ) : patchNotes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>Teacher 전용 패치노트가 없습니다</h3>
            <p>Teacher 전용 업데이트가 있으면 이곳에서 확인하실 수 있습니다.</p>
          </div>
        ) : (
          <div className="teacher-patchnote-layout">
            {/* 사이드바 - 버전 목록 */}
            <aside className="teacher-patchnote-sidebar">
              <div className="sidebar-header">
                <h2>버전 기록</h2>
                <span className="version-count">{patchNotes.length}개</span>
              </div>
              <nav className="version-list">
                {patchNotes.map((note) => (
                  <button
                    key={note.id}
                    className={`version-item ${selectedNote?.id === note.id ? 'active' : ''}`}
                    onClick={() => handleSelectNote(note)}
                  >
                    <div className="version-item-header">
                      <div className="version-item-header-left">
                        <span className="version-number">v{note.version}</span>
                        <span 
                          className="category-dot"
                          style={{ backgroundColor: CATEGORY_CONFIG[note.category].color }}
                        ></span>
                      </div>
                      <span className="version-item-date">{formatDate(note.publishedAt || note.updatedAt)}</span>
                    </div>
                    <p className="version-item-title">{note.title}</p>
                  </button>
                ))}
              </nav>
            </aside>

            {/* 메인 컨텐츠 */}
            <main className="teacher-patchnote-main">
              {selectedNote ? (
                <article className="teacher-patchnote-article">
                  <div className="article-header">
                    <div className="article-meta">
                      <span 
                        className="category-badge"
                        style={{ 
                          color: CATEGORY_CONFIG[selectedNote.category].color,
                          backgroundColor: CATEGORY_CONFIG[selectedNote.category].bgColor,
                        }}
                      >
                        {CATEGORY_CONFIG[selectedNote.category].label}
                      </span>
                      <span className="version-badge">v{selectedNote.version}</span>
                      <span className="visibility-badge teacher">Teacher 전용</span>
                    </div>
                    <h1 className="article-title">{selectedNote.title}</h1>
                    <div className="article-info">
                      <span className="article-date">
                        {formatDate(selectedNote.publishedAt || selectedNote.updatedAt)}
                      </span>
                      <span className="article-author">by {selectedNote.author}</span>
                    </div>
                  </div>
                  <div 
                    className="article-content"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedNote.content, selectedNote.images) }}
                  />
                </article>
              ) : (
                <div className="no-selection">
                  <p>패치노트를 선택해주세요</p>
                </div>
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  );
}
