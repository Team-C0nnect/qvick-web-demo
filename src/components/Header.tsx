import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import apiClient from '../lib/api-client';
import { authService } from '../services/auth.service';
import defaultProfileImage from '../assets/default-profile.svg';
import '../styles/Header.css';
import type { MyUserResponse } from '../types/api';
import { ChevronDownIcon, QvickLogoIcon } from './Icons';
import { useAttendanceView } from '../context/AttendanceViewContext';

interface HeaderProps {
  actions?: ReactNode;
}

type ThemeOption = 'light' | 'dark' | 'system';

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

const THEME_OPTIONS: {
  value: ThemeOption;
  label: string;
  Icon: () => ReactElement;
}[] = [
  { value: 'light', label: '라이트 모드', Icon: SunIcon },
  { value: 'dark', label: '다크 모드', Icon: MoonIcon },
  { value: 'system', label: '시스템 테마', Icon: MonitorIcon },
];

export default function Header({ actions }: HeaderProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [theme, setTheme] = useState<ThemeOption>('system');
  const { attendanceView, setAttendanceView } = useAttendanceView();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const isOpen = isHovered || isPinned;

  useEffect(() => {
    if (!isPinned) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsPinned(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsPinned(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPinned]);

  // Fetch current user info
  const { data: user } = useQuery<MyUserResponse>({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      const response = await apiClient.get<MyUserResponse>('/users/my');
      return response.data;
    },
  });

  const handleLogout = () => {
    setIsPinned(false);
    setIsHovered(false);
    authService.logout();
    queryClient.clear();
    navigate('/login', { replace: true });
  };

  const displayName = user?.roles?.includes('TEACHER')
    ? `${user.name} 선생님`
    : user?.name;

  const profileImage = user?.avatarUrl || defaultProfileImage;

  return (
    <header className="header">
      <Link to="/" className="logo-container">
        <div className="logo-icon">
          <QvickLogoIcon />
        </div>
        <h1 className="logo-text">Qvick</h1>
      </Link>

      <div className="header-actions">
        {actions}
        {user && (
          <div
            className="header-user"
            ref={userMenuRef}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <button
              type="button"
              className={`header-user-trigger ${isOpen ? 'open' : ''}`}
              aria-haspopup="menu"
              aria-expanded={isOpen}
              onClick={() => setIsPinned((pinned) => !pinned)}
            >
              <span className="user-avatar user-avatar-small">
                <img src={profileImage} alt="" />
              </span>
              <span className="user-name">{displayName}</span>
              <ChevronDownIcon className="user-chevron" />
            </button>

            {isOpen && (
              <div className="user-dropdown" role="menu">
                <div className="attendance-view-row">
                  <button
                    type="button"
                    className={`view-label ${
                      attendanceView === 'MORNING' ? 'active' : ''
                    }`}
                    onClick={() => setAttendanceView('MORNING')}
                  >
                    <SunIcon />
                    아침
                  </button>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={attendanceView === 'NIGHT'}
                    aria-label="아침/저녁 보기 전환"
                    className={`view-switch ${
                      attendanceView === 'NIGHT' ? 'on' : ''
                    }`}
                    onClick={() =>
                      setAttendanceView(
                        attendanceView === 'MORNING' ? 'NIGHT' : 'MORNING',
                      )
                    }
                  >
                    <span className="view-switch-knob" />
                  </button>
                  <button
                    type="button"
                    className={`view-label ${
                      attendanceView === 'NIGHT' ? 'active' : ''
                    }`}
                    onClick={() => setAttendanceView('NIGHT')}
                  >
                    <MoonIcon />
                    저녁
                  </button>
                </div>

                <div className="user-dropdown-divider" />

                <div className="user-dropdown-profile">
                  <span className="user-avatar">
                    <img src={profileImage} alt="" />
                  </span>
                  <span className="user-dropdown-name">{displayName}</span>
                </div>

                <div className="user-dropdown-divider" />

                <button
                  type="button"
                  role="menuitem"
                  className="user-dropdown-item user-dropdown-item-logout"
                  onClick={handleLogout}
                >
                  <LogoutIcon />
                  로그아웃
                </button>

                <div className="user-dropdown-divider" />

                <div className="theme-toggle">
                  {THEME_OPTIONS.map(({ value, label, Icon }) => (
                    <button
                      key={value}
                      type="button"
                      className={`theme-option ${theme === value ? 'active' : ''}`}
                      aria-label={label}
                      title={label}
                      onClick={() => setTheme(value)}
                    >
                      <Icon />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
