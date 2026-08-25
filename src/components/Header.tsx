import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import apiClient from '../lib/api-client';
import { authService } from '../services/auth.service';
import '../styles/Header.css';
import type { AttendanceType, MyUserResponse } from '../types/api';
import { ChevronDownIcon } from './Icons';

interface HeaderProps {
  actions?: ReactNode;
}

type ThemeOption = 'light' | 'dark' | 'system';

function HeaderLogoIcon() {
  return (
    <svg viewBox="0 0 87 87" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <path d="M48.59 86.3644C48.5604 77.3388 53.1267 67.8702 60.476 60.5369C67.8247 53.2043 77.3438 48.6201 86.4 48.5904L86.3647 37.7915C73.8271 37.8326 61.7151 44.0464 52.8491 52.8929C43.9837 61.739 37.7513 73.8314 37.7925 86.3998L48.59 86.3644Z" fill="#0F0F10"/>
      <path d="M48.5898 86.382C48.5897 73.8285 42.3675 61.7266 33.5116 52.8706C24.6555 44.0147 12.5536 37.7926 0 37.7926L3.9085e-05 48.5901C9.04186 48.5901 18.5359 53.1652 25.8765 60.5057C33.217 67.8463 37.7922 77.3403 37.7923 86.3821L48.5898 86.382Z" fill="#0F0F10"/>
      <path d="M37.7929 0.000186511C37.7929 8.81036 33.2308 18.311 25.8642 25.7269C18.5021 33.138 9.00902 37.7926 0 37.7926L3.9085e-05 48.5901C12.5865 48.5901 24.6901 42.2307 33.5247 33.3372C42.3545 24.4485 48.5895 12.3533 48.5895 0L37.7929 0.000186511Z" fill="white"/>
      <path d="M37.7929 0.000186511C37.7929 8.81036 33.2308 18.311 25.8642 25.7269C18.5021 33.138 9.00902 37.7926 0 37.7926L3.9085e-05 48.5901C12.5865 48.5901 24.6901 42.2307 33.5247 33.3372C42.3545 24.4485 48.5895 12.3533 48.5895 0L37.7929 0.000186511Z" fill="#0F0F10"/>
      <path d="M48.5895 0C48.5895 9.04185 53.1652 18.5357 60.5058 25.8763C67.8464 33.2169 77.3403 37.7918 86.3822 37.7918L86.3822 48.5894C73.8286 48.5893 61.7267 42.3674 52.8707 33.5113C44.0147 24.6553 37.7929 12.5538 37.7929 0.000186511L48.5895 0Z" fill="url(#paint0_linear_header)"/>
      <defs>
        <linearGradient id="paint0_linear_header" x1="39.0554" y1="4.24454" x2="82.8" y2="46.8675" gradientUnits="userSpaceOnUse">
          <stop stopColor="#897EED"/>
          <stop offset="1" stopColor="#6D23ED"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

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

// 12시 기준으로 아침/저녁 보기 모드 판별 (Check 페이지 시간 기준 로직과 동일)
const getTimeBasedAttendanceView = (now = new Date()): AttendanceType =>
  now.getHours() < 12 ? 'MORNING' : 'NIGHT';

export default function Header({ actions }: HeaderProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [theme, setTheme] = useState<ThemeOption>('system');
  const [attendanceView, setAttendanceView] = useState<AttendanceType>(
    getTimeBasedAttendanceView,
  );
  const userMenuRef = useRef<HTMLDivElement>(null);
  const isOpen = isHovered || isPinned;

  // 시간이 지나면 아침/저녁 보기 모드 자동 전환
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setAttendanceView(getTimeBasedAttendanceView());
    }, 30 * 1000);

    return () => window.clearInterval(intervalId);
  }, []);

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

  const profileInitial = user?.name?.charAt(0) ?? '';

  return (
    <header className="header">
      <Link to="/" className="logo-container">
        <div className="logo-icon">
          <HeaderLogoIcon />
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
                {profileInitial}
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
                    저녁
                  </button>
                </div>

                <div className="user-dropdown-divider" />

                <div className="user-dropdown-profile">
                  <span className="user-avatar">{profileInitial}</span>
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
