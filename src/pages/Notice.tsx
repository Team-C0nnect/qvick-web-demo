import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { announcementService } from '../services/announcement.service';
import { NoticeGridSkeleton } from '../components/Skeleton';
import NoticeCreateModal from '../components/NoticeCreateModal';
import { PinIcon } from '../components/Icons';
import { useToast } from '../hooks/useToast';
import '../styles/Notice.css';

interface NoticeItem {
  id: number;
  category: string;
  title: string;
  author: string;
  date: string;
  time: string;
  createdAt: string;
  isPinned: boolean;
}

export default function Notice() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [filter, setFilter] = useState('올해');
  const [currentPage] = useState(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
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
    onSuccess: (_data, noticeIds) => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setSelectedNotices([]);
      toast.success(
        noticeIds.length > 1
          ? `${noticeIds.length}개의 공지사항을 삭제했습니다.`
          : '공지사항을 삭제했습니다.',
      );
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
      if (pin) {
        const [noticeId] = noticeIds;
        await announcementService.pinOnlyAnnouncement(noticeId);
        return;
      }

      await Promise.all(
        noticeIds.map((id) =>
          announcementService.unpinAnnouncement(id),
        ),
      );
    },
    onSuccess: (_data, { noticeIds, pin }) => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setSelectedNotices([]);
      if (pin) {
        toast.success('공지사항을 고정했습니다.');
        return;
      }

      toast.success(
        noticeIds.length > 1
          ? `${noticeIds.length}개의 공지사항을 고정 해제했습니다.`
          : '공지사항을 고정 해제했습니다.',
      );
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

    if (selectedNotices.length > 1) {
      toast.warning('고정 공지사항은 하나만 선택할 수 있습니다.');
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
      date: new Date(announcement.createdAt).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }),
      time: new Date(announcement.createdAt).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      createdAt: announcement.createdAt,
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

  const filteredNotices = notices
    .filter(isNoticeInFilter)
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  const totalCount = announcementsData?.totalElements || 0;
  const pinnedCount = notices.filter((notice) => notice.isPinned).length;
  const selectedCount = selectedNotices.length;
  const selectedNoticeItems = filteredNotices.filter((notice) =>
    selectedNotices.includes(notice.id),
  );
  const shouldUnpinSelected =
    selectedNoticeItems.length > 0 &&
    selectedNoticeItems.every((notice) => notice.isPinned);
  const isMutating = deleteMutation.isPending || pinMutation.isPending;

  if (isLoading) {
    return (
      <div className="notice-page">
        <NoticeGridSkeleton />
      </div>
    );
  }

  return (
    <div className="notice-page">
      <section className="notice-page-header">
        <div>
          <span className="notice-kicker">Announcements</span>
          <h1 className="page-title">공지사항</h1>
          <p className="notice-page-description">
            기숙사 공지를 작성하고 고정 공지를 빠르게 관리합니다.
          </p>
        </div>
        <button
          type="button"
          className="create-button"
          onClick={() => setIsCreateModalOpen(true)}
        >
          공지사항 작성
        </button>
      </section>

      <section className="notice-toolbar" aria-label="공지사항 필터와 작업">
        <div className="filter-section" aria-label="기간 필터">
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

        <div className="notice-summary">
          <span>
            전체 <strong>{totalCount}</strong>
          </span>
          <span>
            고정 <strong>{pinnedCount}</strong>
          </span>
          <span>
            표시 <strong>{filteredNotices.length}</strong>
          </span>
        </div>
      </section>

      <section className="notice-list-header">
        <div>
          <span className="notice-kicker">List</span>
          <h2>공지 목록</h2>
        </div>
        {filteredNotices.length > 0 && (
          <div className="notice-list-actions" aria-label="공지 선택 작업">
            {selectedCount > 0 && (
              <>
                <button
                  type="button"
                  className={`action-button ${shouldUnpinSelected ? 'unpin' : 'pin'}`}
                  onClick={
                    shouldUnpinSelected ? handleUnpinSelected : handlePinSelected
                  }
                  disabled={isMutating}
                >
                  {shouldUnpinSelected ? '고정 해제' : '고정'}
                </button>
                <button
                  type="button"
                  className="action-button delete"
                  onClick={handleDeleteSelected}
                  disabled={isMutating}
                >
                  삭제
                </button>
              </>
            )}
            <button
              type="button"
              className="select-all-button"
              onClick={handleSelectAll}
              disabled={isMutating}
            >
              {selectedCount === filteredNotices.length
                ? '전체 해제'
                : '전체 선택'}
            </button>
          </div>
        )}
      </section>

      <div className="notice-grid">
        {filteredNotices.length === 0 ? (
          <div className="notice-empty-state">
            해당 기간에 등록된 공지사항이 없습니다.
          </div>
        ) : (
          filteredNotices.map((notice) => {
            const isSelected = selectedNotices.includes(notice.id);
            return (
              <article
                key={notice.id}
                className={`notice-card ${isSelected ? 'selected' : ''} ${notice.isPinned ? 'pinned' : ''}`}
                onClick={() => navigate(`/notice/${notice.id}`)}
              >
                <div className="notice-header">
                  <div className="notice-badges">
                    {notice.isPinned && (
                      <span className="notice-pin-badge">
                        <PinIcon className="notice-pin-badge-icon" />
                        고정됨
                      </span>
                    )}
                    <span className="notice-category">{notice.category}</span>
                  </div>
                  <label
                    className="notice-select"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="sr-only">{notice.title} 선택</span>
                    <input
                      type="checkbox"
                      className="notice-checkbox"
                      checked={isSelected}
                      onChange={(e) => handleToggleNotice(notice.id, e)}
                    />
                  </label>
                </div>
                <h3 className="notice-title">{notice.title}</h3>
                <div className="notice-card-footer">
                  <span className="notice-author">{notice.author}</span>
                  <span className="notice-date">
                    {notice.date}
                    <small>{notice.time}</small>
                  </span>
                </div>
              </article>
            );
          })
        )}
      </div>

      <NoticeCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

    </div>
  );
}
