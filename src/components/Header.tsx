import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import apiClient from '../lib/api-client';
import { authService } from '../services/auth.service';
import defaultProfileImage from '../assets/default-profile.svg';
import '../styles/Header.css';
import type { MyUserResponse } from '../types/api';
import { ChevronDownIcon, QvickLogoIcon } from './Icons';
import { useGenderView } from '../context/GenderViewContext';

interface HeaderProps {
  actions?: ReactNode;
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

export default function Header({ actions }: HeaderProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const { genderView, setGenderView } = useGenderView();
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
                      genderView === '남' ? 'active' : ''
                    }`}
                    onClick={() => setGenderView('남')}
                  >
                    남
                  </button>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={genderView === '여'}
                    aria-label="남/여 보기 전환"
                    className={`view-switch ${
                      genderView === '여' ? 'on' : ''
                    }`}
                    onClick={() =>
                      setGenderView(
                        genderView === '남' ? '여' : '남',
                      )
                    }
                  >
                    <span className="view-switch-knob" />
                  </button>
                  <button
                    type="button"
                    className={`view-label ${
                      genderView === '여' ? 'active' : ''
                    }`}
                    onClick={() => setGenderView('여')}
                  >
                    여
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
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
