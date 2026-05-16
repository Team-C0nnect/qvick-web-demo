import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { announcementService } from '../services/announcement.service';
import { NoticeGridSkeleton } from '../components/Skeleton';
import NoticeCreateModal from '../components/NoticeCreateModal';
import NoticeEditModal from '../components/NoticeEditModal';
import '../styles/Notice.css';

interface NoticeItem {
  id: number;
  category: string;
  title: string;
  author: string;
  date: string;
  createdAt: string;
  checked: boolean;
  isPinned: boolean;
}

export default function Notice() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('올해');
  const [currentPage] = useState(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingNoticeId, setEditingNoticeId] = useState<number | null>(null);
  const [selectedNotices, setSelectedNotices] = useState<number[]>([]);

  // Fetch announcements
  const { data: announcementsData, isLoading } = useQuery({
    queryKey: ['announcements', currentPage],
    queryFn: () =>
      announcementService.getAnnouncements({ page: currentPage, size: 12 }),
  });

  // 삭제 mutation
  const deleteMutation = useMutation({
    mutationFn: async (noticeIds: number[]) => {
      await Promise.all(
        noticeIds.map((id) => announcementService.deleteAnnouncement(id)),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setSelectedNotices([]);
    },
    onError: (error: Error) => {
      console.error('Delete error:', error);
      alert('공지사항 삭제에 실패했습니다.');
    },
  });

  // 고정/고정 해제 mutation
  const pinMutation = useMutation({
    mutationFn: async ({
      noticeIds,
      pin,
    }: {
      noticeIds: number[];
      pin: boolean;
    }) => {
      await Promise.all(
        noticeIds.map((id) =>
          pin
            ? announcementService.pinAnnouncement(id)
            : announcementService.unpinAnnouncement(id),
        ),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setSelectedNotices([]);
    },
    onError: (error: Error) => {
      console.error('Pin error:', error);
      alert('공지사항 고정 변경에 실패했습니다.');
    },
  });

  const handleToggleNotice = (
    noticeId: number,
    e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent,
  ) => {
    e.stopPropagation();
    setSelectedNotices((prev) =>
      prev.includes(noticeId)
        ? prev.filter((id) => id !== noticeId)
        : [...prev, noticeId],
    );
  };

  const handleSelectAll = () => {
    if (selectedNotices.length === filteredNotices.length) {
      setSelectedNotices([]);
    } else {
      setSelectedNotices(filteredNotices.map((n) => n.id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedNotices.length === 0) {
      alert('삭제할 공지사항을 선택해주세요.');
      return;
    }

    if (
      window.confirm(
        `선택한 ${selectedNotices.length}개의 공지사항을 삭제하시겠습니까?`,
      )
    ) {
      deleteMutation.mutate(selectedNotices);
    }
  };

  const handlePinSelected = () => {
    if (selectedNotices.length === 0) {
      alert('고정할 공지사항을 선택해주세요.');
      return;
    }

    pinMutation.mutate({ noticeIds: selectedNotices, pin: true });
  };

  const handleUnpinSelected = () => {
    if (selectedNotices.length === 0) {
      alert('고정 해제할 공지사항을 선택해주세요.');
      return;
    }

    pinMutation.mutate({ noticeIds: selectedNotices, pin: false });
  };

  const filters = ['어제', '오늘', '이번 주', '이번 달', '올해'];

  // Transform API data to NoticeItem format
  const notices: NoticeItem[] =
    announcementsData?.content.map((announcement) => ({
      id: announcement.id,
      category: '기숙사 생활 안내',
      title: announcement.title,
      author: announcement.author.name,
      date: new Date(announcement.createdAt).toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      createdAt: announcement.createdAt,
      checked: false,
      isPinned: announcement.isPinned,
    })) || [];

  const isNoticeInFilter = (notice: NoticeItem) => {
    const createdAt = new Date(notice.createdAt);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    switch (filter) {
      case '어제':
        return createdAt >= yesterday && createdAt < today;
      case '오늘':
        return createdAt >= today;
      case '이번 주':
        return createdAt >= weekStart;
      case '이번 달':
        return createdAt >= monthStart;
      case '올해':
        return createdAt >= yearStart;
      default:
        return true;
    }
  };

  const filteredNotices = notices.filter(isNoticeInFilter);

  if (isLoading) {
    return (
      <div className="notice-page">
        <NoticeGridSkeleton />
      </div>
    );
  }

  return (
    <div className="notice-page">
      <h1 className="page-title">공지사항</h1>

      <div className="filter-section">
        {filters.map((item) => (
          <button
            key={item}
            type="button"
            className={`filter-button ${filter === item ? 'active' : ''}`}
            onClick={() => {
              setFilter(item);
              setSelectedNotices([]);
            }}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="tabs-section">
        <div className="tab active">전체</div>
      </div>

      <div className="action-section">
        <div className="left-actions">
          <div className="count-badge">
            전체{' '}
            <span className="count">
              {announcementsData?.totalElements || 0}
            </span>
          </div>
          {selectedNotices.length > 0 && (
            <>
              <button
                type="button"
                className="action-button select-all"
                onClick={handleSelectAll}
              >
                {selectedNotices.length === filteredNotices.length
                  ? '전체 해제'
                  : '전체 선택'}
              </button>
              <button
                type="button"
                className="action-button pin"
                onClick={handlePinSelected}
              >
                고정 ({selectedNotices.length})
              </button>
              <button
                type="button"
                className="action-button unpin"
                onClick={handleUnpinSelected}
              >
                고정 해제 ({selectedNotices.length})
              </button>
              <button
                type="button"
                className="action-button delete"
                onClick={handleDeleteSelected}
              >
                삭제 ({selectedNotices.length})
              </button>
            </>
          )}
        </div>
        <button
          type="button"
          className="create-button"
          onClick={() => setIsCreateModalOpen(true)}
        >
          공지사항 작성
        </button>
      </div>

      <div className="notice-grid">
        {filteredNotices.length === 0 ? (
          <div className="notice-empty-state">
            해당 기간에 등록된 공지사항이 없습니다.
          </div>
        ) : (
          filteredNotices.map((notice) => (
            <div
              key={notice.id}
              className={`notice-card ${selectedNotices.includes(notice.id) ? 'selected' : ''}`}
              onClick={() => navigate(`/notice/${notice.id}`)}
            >
              <div className="notice-header">
                <span className="notice-category">{notice.category}</span>
                {notice.isPinned && (
                  <span className="pinned-badge">고정됨</span>
                )}
                <input
                  type="checkbox"
                  className="notice-checkbox"
                  checked={selectedNotices.includes(notice.id)}
                  onChange={(e) => handleToggleNotice(notice.id, e)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <h3 className="notice-title">{notice.title}</h3>
              <p className="notice-author">{notice.author}</p>
              <p className="notice-date">{notice.date}</p>
            </div>
          ))
        )}
      </div>

      <NoticeCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {editingNoticeId && (
        <NoticeEditModal
          isOpen={true}
          noticeId={editingNoticeId}
          onClose={() => setEditingNoticeId(null)}
        />
      )}
    </div>
  );
}
