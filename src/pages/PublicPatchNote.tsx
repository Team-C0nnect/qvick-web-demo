import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { patchNoteService } from '../services/patchnote.service';
import { CATEGORY_CONFIG } from '../types/patchnote';
import type { PatchNote, PatchNoteImage } from '../types/patchnote';
import '../styles/PatchNote.css';

// Qvick 로고 아이콘
function QvickLogoIcon() {
  return (
    <svg viewBox="0 0 87 87" fill="none" xmlns="http://www.w3.org/2000/svg" className="qvick-logo">
      <path d="M48.59 86.3644C48.5604 77.3388 53.1267 67.8702 60.476 60.5369C67.8247 53.2043 77.3438 48.6201 86.4 48.5904L86.3647 37.7915C73.8271 37.8326 61.7151 44.0464 52.8491 52.8929C43.9837 61.739 37.7513 73.8314 37.7925 86.3998L48.59 86.3644Z" fill="#0F0F10"/>
      <path d="M48.5898 86.382C48.5897 73.8285 42.3675 61.7266 33.5116 52.8706C24.6555 44.0147 12.5536 37.7926 0 37.7926L3.9085e-05 48.5901C9.04186 48.5901 18.5359 53.1652 25.8765 60.5057C33.217 67.8463 37.7922 77.3403 37.7923 86.3821L48.5898 86.382Z" fill="#0F0F10"/>
      <path d="M37.7929 0.000186511C37.7929 8.81036 33.2308 18.311 25.8642 25.7269C18.5021 33.138 9.00902 37.7926 0 37.7926L3.9085e-05 48.5901C12.5865 48.5901 24.6901 42.2307 33.5247 33.3372C42.3545 24.4485 48.5895 12.3533 48.5895 0L37.7929 0.000186511Z" fill="#0F0F10"/>
      <path d="M48.5895 0C48.5895 9.04185 53.1652 18.5357 60.5058 25.8763C67.8464 33.2169 77.3403 37.7918 86.3822 37.7918L86.3822 48.5894C73.8286 48.5893 61.7267 42.3674 52.8707 33.5113C44.0147 24.6553 37.7929 12.5538 37.7929 0.000186511L48.5895 0Z" fill="url(#paint0_linear_public)"/>
      <defs>
        <linearGradient id="paint0_linear_public" x1="39.0554" y1="4.24454" x2="82.8" y2="46.8675" gradientUnits="userSpaceOnUse">
          <stop stopColor="#897EED"/>
          <stop offset="1" stopColor="#6D23ED"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function PublicPatchNotePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patchNotes, setPatchNotes] = useState<PatchNote[]>([]);
  const [selectedNote, setSelectedNote] = useState<PatchNote | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPatchNotes = async () => {
      setIsLoading(true);
      try {
        // public 패치노트만 가져오기
        const notes = await patchNoteService.getPublishedPatchNotes('public');
        setPatchNotes(notes);
        
        if (id) {
          const note = notes.find((n) => n.id === id);
          setSelectedNote(note || null);
        } else if (notes.length > 0) {
          setSelectedNote(notes[0]);
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
    navigate(`/patchnote/public/${note.id}`, { replace: true });
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
    
    html = html
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      // External images
      .replace(/!\[(.*?)\]\((https?:\/\/[^)]+)\)/g, '<img src="$2" alt="$1" class="patchnote-image" />')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br/>');
    
    html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    
    return `<p>${html}</p>`;
  };

  if (isLoading) {
    return (
      <div className="patchnote-page">
        <div className="patchnote-loading">
          <div className="loading-spinner"></div>
          <p>패치노트를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="patchnote-page">
      {/* 헤더 */}
      <header className="patchnote-header">
        <div className="header-content">
          <div className="header-brand" onClick={() => window.location.href = 'https://qvick.kr'}>
            <QvickLogoIcon />
            <span className="brand-text">Qvick</span>
          </div>
          <h1 className="header-title">패치노트</h1>
          <p className="header-subtitle">Qvick의 새로운 업데이트 소식을 확인하세요</p>
        </div>
        <div className="header-decoration">
          <div className="decoration-circle circle-1"></div>
          <div className="decoration-circle circle-2"></div>
          <div className="decoration-circle circle-3"></div>
        </div>
      </header>

      <div className="patchnote-container">
        {patchNotes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>아직 패치노트가 없습니다</h3>
            <p>새로운 업데이트가 있으면 이곳에서 확인하실 수 있습니다.</p>
          </div>
        ) : (
          <div className="patchnote-layout">
            {/* 사이드바 - 버전 목록 */}
            <aside className="patchnote-sidebar">
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
                      <span className="version-number">v{note.version}</span>
                      <span 
                        className="category-dot"
                        style={{ backgroundColor: CATEGORY_CONFIG[note.category].color }}
                      ></span>
                    </div>
                    <p className="version-item-title">{note.title}</p>
                    <span className="version-item-date">{formatDate(note.publishedAt || note.updatedAt)}</span>
                  </button>
                ))}
              </nav>
            </aside>

            {/* 메인 컨텐츠 */}
            <main className="patchnote-main">
              {selectedNote ? (
                <article className="patchnote-article">
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

      {/* 푸터 */}
      <footer className="patchnote-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <QvickLogoIcon />
            <span>Qvick</span>
          </div>
          <p className="footer-copyright">© 2024 Qvick. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
