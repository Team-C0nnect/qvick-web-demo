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
    { path: '/notice', label: '공지사항', icon: 'notice' },
    { path: '/schedule', label: '일정 관리', icon: 'schedule' },
    { path: '/room', label: '방 관리', icon: 'room' },
    { path: '/student-management', label: '학생 관리', icon: 'student' },
    { path: '/teacher-patchnote', label: '패치노트', icon: 'patchnote' },
  ];

  const adminMenuItems = [
    { path: '/admin/patchnote', label: '패치노트 관리', icon: 'patchnote' },
    { path: '/admin/inquiry', label: '문의 관리', icon: 'inquiry' },
  ];

  const getIcon = (iconType: string) => {
    switch (iconType) {
      case 'dashboard':
        return <DashboardIcon className="menu-icon" />;
      case 'check':
        return <DocumentIcon className="menu-icon" />;
      case 'notice':
        return <NoticeIcon className="menu-icon" />;
      case 'schedule':
        return <CalendarIcon className="menu-icon" />;
      case 'room':
        return <RoomIcon className="menu-icon" />;
      case 'student':
        return <StudentIcon className="menu-icon" />;
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
