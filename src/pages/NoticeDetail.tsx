import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { announcementService } from '../services/announcement.service';
import Header from '../components/Header';
import NoticeEditModal from '../components/NoticeEditModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import '../styles/NoticeDetail.css';

export default function NoticeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const announcementId = parseInt(id || '0', 10);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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
        <Header />
        <div className="notice-detail-container">
          <div className="loading">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (error || !announcement) {
    return (
      <div className="notice-detail-page">
        <Header />
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
      <Header />
      
      <div className="notice-detail-container">
        <div className="detail-header-actions">
          <button className="back-button" onClick={handleBack}>
            ← 목록으로
          </button>
          <div className="detail-action-buttons">
            <button 
              className="detail-action-btn pin"
              onClick={handleTogglePin}
              disabled={pinMutation.isPending}
            >
              {announcement.isPinned ? '고정 해제' : '고정'}
            </button>
            <button 
              className="detail-action-btn edit"
              onClick={() => setIsEditModalOpen(true)}
            >
              수정
            </button>
            <button 
              className="detail-action-btn delete"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              삭제
            </button>
          </div>
        </div>

        <article className="notice-article">
          <header className="notice-detail-header">
            {announcement.isPinned && (
              <span className="pinned-badge">📌 고정</span>
            )}
            <h1 className="notice-detail-title">{announcement.title}</h1>
            
            <div className="notice-meta">
              <div className="author-info">
                <img 
                  src={announcement.author.avatarUrl} 
                  alt={announcement.author.name}
                  className="author-avatar"
                />
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
