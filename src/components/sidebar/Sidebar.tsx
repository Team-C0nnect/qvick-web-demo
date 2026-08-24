import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { ComponentType } from 'react';
import '../../styles/Sidebar.css';
import DashboardIcon from './svg/dashboard.svg?react';
import CheckIcon from './svg/check.svg?react';
import NightStudyIcon from './svg/night-study.svg?react';
import PhoneSubmissionIcon from './svg/phone-submission.svg?react';
import SleepoverIcon from './svg/sleepover.svg?react';
import NoticeIcon from './svg/notice.svg?react';
import ScheduleIcon from './svg/schedule.svg?react';
import RoomIcon from './svg/room.svg?react';
import PhoneBoxIcon from './svg/phone-box.svg?react';
import PatchNoteIcon from './svg/patchnote.svg?react';
import CouncilIcon from './svg/council.svg?react';
import InquiryIcon from './svg/inquiry.svg?react';
import AccountIcon from './svg/account.svg?react';
import StudentIcon from './svg/student.svg?react';
import { apiClient } from '../../lib/api-client';
import type { MyUserResponse } from '../../types/api';

type SidebarIcon = ComponentType<{ className?: string }>;

const MENU_ICONS: Record<string, SidebarIcon> = {
  dashboard: DashboardIcon,
  check: CheckIcon,
  book: NightStudyIcon,
  phone: PhoneSubmissionIcon,
  sleepover: SleepoverIcon,
  notice: NoticeIcon,
  schedule: ScheduleIcon,
  room: RoomIcon,
  phonebox: PhoneBoxIcon,
  council: CouncilIcon,
  student: StudentIcon,
  account: AccountIcon,
  patchnote: PatchNoteIcon,
  inquiry: InquiryIcon,
};

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
    { path: '/phone-boxes', label: '휴대폰 제출함', icon: 'phonebox' },
    { path: '/teacher-patchnote', label: '패치노트', icon: 'patchnote' },
  ];

  const adminMenuItems = [
    { path: '/admin/council', label: '자치위원', icon: 'council' },
    { path: '/admin/patchnote', label: '패치노트 관리', icon: 'patchnote' },
    { path: '/admin/inquiry', label: '문의 관리', icon: 'inquiry' },
    { path: '/admin/account-management', label: '계정 관리', icon: 'account' },
  ];

  const getIcon = (iconType: string) => {
    const Icon = MENU_ICONS[iconType];
    if (!Icon) {
      return <div className="menu-icon"></div>;
    }
    return <Icon className="menu-icon" />;
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
