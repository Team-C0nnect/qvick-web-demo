import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import '../styles/Sidebar.css';
import {
  DashboardIcon,
  DocumentIcon,
  NoticeIcon,
  CalendarIcon,
  RoomIcon,
  PatchNoteIcon,
} from './Icons';
import { apiClient } from '../lib/api-client';
import type { MyUserResponse } from '../types/api';

// 문의 아이콘
function InquiryIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

// 학생 아이콘
function StudentIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M6 20c0-2 2-4 6-4s6 2 6 4" />
      <path d="M2 12h20" strokeLinecap="round" />
    </svg>
  );
}

// 외박 아이콘
function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
        fill="currentColor"
      />
    </svg>
  );
}

// 심자 확인 아이콘
function BookIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 6.4C10.5 5.3 8.7 4.7 6.4 4.7H4.6a1 1 0 0 0-1 1v12.6a1 1 0 0 0 1 1h1.8c2.3 0 4.1.6 5.6 1.7" />
      <path d="M12 6.4c1.5-1.1 3.3-1.7 5.6-1.7h1.8a1 1 0 0 1 1 1v12.6a1 1 0 0 1-1 1h-1.8c-2.3 0-4.1.6-5.6 1.7" />
      <path d="M12 6.4v14.6" />
      <path d="M6.4 8.7h2.8" />
      <path d="M6.4 11.5h3.2" />
      <path d="M6.4 14.3h2.6" />
      <path d="M14.8 8.7h2.8" />
      <path d="M14.4 11.5h3.2" />
      <path d="M15 14.3h2.6" />
    </svg>
  );
}

// 제출 확인 아이콘
function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.6" />
      <path d="M10 5.5h4" />
      <path d="M9 17.5h6" />
      <circle cx="12" cy="19.5" r="0.35" fill="currentColor" stroke="none" />
    </svg>
  );
}

// 자치위원 아이콘
function CouncilIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
    </svg>
  );
}

// 계정 관리 아이콘
function AccountIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
      <path d="M16 11h6" strokeLinecap="round" />
      <path d="M19 8v6" strokeLinecap="round" />
    </svg>
  );
}

export default function Sidebar() {
  // 사용자 정보 조회
  const { data: user } = useQuery<MyUserResponse>({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      const response = await apiClient.get<MyUserResponse>('/users/my');
      return response.data;
    },
  });

  const isAdmin = user?.roles?.includes('ADMIN');

  const menuItems = [
    { path: '/', label: '대시 보드', icon: 'dashboard' },
    { path: '/check', label: '인원 확인', icon: 'check' },
    { path: '/night-study', label: '심야자습 확인', icon: 'book' },
    { path: '/phone-submissions', label: '휴대폰 제출 확인', icon: 'phone' },
    { path: '/sleepovers', label: '외박 확인', icon: 'sleepover' },
    { path: '/notice', label: '공지사항', icon: 'notice' },
    { path: '/schedule', label: '일정 관리', icon: 'schedule' },
    { path: '/room', label: '방 관리', icon: 'room' },
    { path: '/teacher-patchnote', label: '패치노트', icon: 'patchnote' },
  ];

  const adminMenuItems = [
    { path: '/admin/council', label: '자치위원', icon: 'council' },
    { path: '/admin/patchnote', label: '패치노트 관리', icon: 'patchnote' },
    { path: '/admin/inquiry', label: '문의 관리', icon: 'inquiry' },
    { path: '/admin/account-management', label: '계정 관리', icon: 'account' },
  ];

  const getIcon = (iconType: string) => {
    switch (iconType) {
      case 'dashboard':
        return <DashboardIcon className="menu-icon" />;
      case 'check':
        return <DocumentIcon className="menu-icon" />;
      case 'sleepover':
        return <MoonIcon className="menu-icon" />;
      case 'book':
        return <BookIcon className="menu-icon" />;
      case 'phone':
        return <PhoneIcon className="menu-icon" />;
      case 'notice':
        return <NoticeIcon className="menu-icon" />;
      case 'schedule':
        return <CalendarIcon className="menu-icon" />;
      case 'room':
        return <RoomIcon className="menu-icon" />;
      case 'council':
        return <CouncilIcon className="menu-icon" />;
      case 'student':
        return <StudentIcon className="menu-icon" />;
      case 'account':
        return <AccountIcon className="menu-icon" />;
      case 'patchnote':
        return <PatchNoteIcon className="menu-icon" />;
      case 'inquiry':
        return <InquiryIcon className="menu-icon" />;
      default:
        return <div className="menu-icon"></div>;
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `menu-item ${isActive ? 'active' : ''}`
            }
          >
            {getIcon(item.icon)}
            <span className="menu-text">{item.label}</span>
          </NavLink>
        ))}
      </div>

      {/* 관리자 권한일 때만 관리자 메뉴 표시 */}
      {isAdmin && (
        <>
          <div className="sidebar-divider"></div>

          <div className="sidebar-section">
            <div className="sidebar-section-title">관리자</div>
            {adminMenuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `menu-item ${isActive ? 'active' : ''}`
                }
              >
                {getIcon(item.icon)}
                <span className="menu-text">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </>
      )}
    </aside>
  );
}
