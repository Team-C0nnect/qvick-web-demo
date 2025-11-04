import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { announcementService } from '../services/announcement.service';
import NoticeCreateModal from '../components/NoticeCreateModal';
import '../styles/Notice.css';

interface NoticeItem {
  id: number;
  category: string;
  title: string;
  author: string;
  date: string;
  checked: boolean;
  isPinned: boolean;
}

export default function Notice() {
  const [filter, setFilter] = useState('이번 달');
  const [currentPage, setCurrentPage] = useState(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Fetch announcements
  const { data: announcementsData, isLoading } = useQuery({
    queryKey: ['announcements', currentPage],
    queryFn: () => announcementService.getAnnouncements({ page: currentPage, size: 12 }),
  });

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
      checked: false,
      isPinned: announcement.isPinned,
    })) || [];

  if (isLoading) {
    return (
      <div className="notice-page">
        <div className="loading">공지사항을 불러오는 중...</div>
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
            className={`filter-button ${filter === item ? 'active' : ''}`}
            onClick={() => setFilter(item)}
          >
            {item}
          </button>
        ))}
        <button className="date-range-button">
          <div className="calendar-icon"></div>
          2025-08-01 ~ 2025-08-28
          <div className="dropdown-icon"></div>
        </button>
      </div>

      <div className="tabs-section">
        <div className="tab active">전체</div>
        <div className="tab">공지사항 관리</div>
        <div className="tab">공지사항 백업</div>
      </div>

      <div className="action-section">
        <div className="count-badge">
          전체 <span className="count">{announcementsData?.totalElements || 0}</span>
        </div>
        <button className="create-button" onClick={() => setIsCreateModalOpen(true)}>
          공지사항 작성
        </button>
      </div>

      <div className="notice-grid">
        {notices.map((notice) => (
          <div key={notice.id} className="notice-card">
            <div className="notice-header">
              <span className="notice-category">{notice.category}</span>
              {notice.isPinned && <span className="pinned-badge">고정됨</span>}
              <div className={`checkbox ${notice.checked ? 'checked' : ''}`}></div>
            </div>
            <h3 className="notice-title">{notice.title}</h3>
            <p className="notice-author">{notice.author}</p>
            <p className="notice-date">{notice.date}</p>
          </div>
        ))}
      </div>

      <NoticeCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
