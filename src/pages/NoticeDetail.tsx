import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { announcementService } from '../services/announcement.service';
import NoticeEditModal from '../components/NoticeEditModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import '../styles/NoticeDetail.css';

function PinIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14.5 3.5L20.5 9.5M15.5 4.5L10.5 9.5C9.7 10.3 8.6 10.75 7.47 10.75H6.75L13.25 17.25V16.53C13.25 15.4 13.7 14.3 14.5 13.5L19.5 8.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.75 14.25L4 20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PencilIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20H8L18.5 9.5C19.6046 8.39543 19.6046 6.60457 18.5 5.5C17.3954 4.39543 15.6046 4.39543 14.5 5.5L4 16V20Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 6.5L17.5 10.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TrashIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7H20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M10 11V17M14 11V17M6 7L7 20H17L18 7M9 7V4H15V7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function NoticeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const announcementId = parseInt(id || '0', 10);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    if (typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      return;
    }

    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [announcementId]);

  const { data: announcement, isLoading, error } = useQuery({
    queryKey: ['announcement', announcementId],
    queryFn: () => announcementService.getAnnouncement(announcementId),
    enabled: !!announcementId,
  });

  // 삭제 mutation
  const deleteMutation = useMutation({
    mutationFn: () => announcementService.deleteAnnouncement(announcementId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      navigate('/notice');
    },
    onError: (error: Error) => {
      console.error('Delete error:', error);
      alert('공지사항 삭제에 실패했습니다.');
    },
  });

  // 고정/고정 해제 mutation
  const pinMutation = useMutation({
    mutationFn: (pin: boolean) => 
      pin ? announcementService.pinAnnouncement(announcementId) : announcementService.unpinAnnouncement(announcementId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcement', announcementId] });
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
    onError: (error: Error) => {
      console.error('Pin error:', error);
      alert('공지사항 고정 변경에 실패했습니다.');
    },
  });

  const handleBack = () => {
    navigate('/notice');
  };

  const handleDelete = () => {
    if (window.confirm('이 공지사항을 삭제하시겠습니까?')) {
      deleteMutation.mutate();
    }
  };

  const handleTogglePin = () => {
    if (announcement) {
      pinMutation.mutate(!announcement.isPinned);
    }
  };

  if (isLoading) {
    return (
      <div className="notice-detail-page">
        <div className="notice-detail-container">
          <div className="loading">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (error || !announcement) {
    return (
      <div className="notice-detail-page">
        <div className="notice-detail-container">
          <div className="error-state">
            <p>공지사항을 불러올 수 없습니다.</p>
            <button className="back-button" onClick={handleBack}>
              목록으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="notice-detail-page">
      <div className="notice-detail-container">
        <div className="detail-header-actions">
          <button className="notice-detail-back-button" onClick={handleBack}>
            목록으로
          </button>
        </div>

        <article className="notice-article">
          <header className="notice-detail-header">
            <div className="notice-detail-header-top">
              <div className="notice-detail-badges">
                <span className="notice-detail-category">기숙사 생활 안내</span>
                {announcement.isPinned && (
                  <span className="notice-detail-pin-badge">고정됨</span>
                )}
              </div>
              <div className="detail-icon-actions" aria-label="공지 작업">
                <button
                  type="button"
                  className={`detail-icon-button pin ${announcement.isPinned ? 'active' : ''}`}
                  onClick={handleTogglePin}
                  disabled={pinMutation.isPending}
                  aria-label={announcement.isPinned ? '공지 고정 해제' : '공지 고정'}
                  title={announcement.isPinned ? '고정 해제' : '고정'}
                >
                  <PinIcon className="detail-action-icon" />
                </button>
                <button
                  type="button"
                  className="detail-icon-button edit"
                  onClick={() => setIsEditModalOpen(true)}
                  aria-label="공지 수정"
                  title="수정"
                >
                  <PencilIcon className="detail-action-icon" />
                </button>
                <button
                  type="button"
                  className="detail-icon-button delete"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  aria-label="공지 삭제"
                  title="삭제"
                >
                  <TrashIcon className="detail-action-icon" />
                </button>
              </div>
            </div>
            <h1 className="notice-detail-title">{announcement.title}</h1>
            
            <div className="notice-detail-meta">
              <div className="author-info">
                {announcement.author.avatarUrl ? (
                  <img
                    src={announcement.author.avatarUrl}
                    alt={announcement.author.name}
                    className="author-avatar"
                  />
                ) : (
                  <span className="author-avatar author-avatar-fallback">
                    {announcement.author.name.slice(0, 1)}
                  </span>
                )}
                <span className="author-name">{announcement.author.name}</span>
              </div>
              <div className="date-info">
                <span className="created-date">{formatDate(announcement.createdAt)}</span>
                {announcement.createdAt !== announcement.updatedAt && (
                  <span className="updated-date">(수정됨: {formatDate(announcement.updatedAt)})</span>
                )}
              </div>
            </div>
          </header>

          <div className="notice-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {announcement.content}
            </ReactMarkdown>
          </div>
        </article>
      </div>

      {isEditModalOpen && (
        <NoticeEditModal
          isOpen={isEditModalOpen}
          noticeId={announcementId}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}
    </div>
  );
}
