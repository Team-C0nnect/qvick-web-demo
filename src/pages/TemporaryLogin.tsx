import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { temporaryAttendanceService } from '../services/temporary-attendance.service';
import '../styles/TemporaryLogin.css';

function LogoIcon() {
  return (
    <svg viewBox="0 0 87 87" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <path d="M48.59 86.3644C48.5604 77.3388 53.1267 67.8702 60.476 60.5369C67.8247 53.2043 77.3438 48.6201 86.4 48.5904L86.3647 37.7915C73.8271 37.8326 61.7151 44.0464 52.8491 52.8929C43.9837 61.739 37.7513 73.8314 37.7925 86.3998L48.59 86.3644Z" fill="#0F0F10"/>
      <path d="M48.5898 86.382C48.5897 73.8285 42.3675 61.7266 33.5116 52.8706C24.6555 44.0147 12.5536 37.7926 0 37.7926L3.9085e-05 48.5901C9.04186 48.5901 18.5359 53.1652 25.8765 60.5057C33.217 67.8463 37.7922 77.3403 37.7923 86.3821L48.5898 86.382Z" fill="#0F0F10"/>
      <path d="M37.7929 0.000186511C37.7929 8.81036 33.2308 18.311 25.8642 25.7269C18.5021 33.138 9.00902 37.7926 0 37.7926L3.9085e-05 48.5901C12.5865 48.5901 24.6901 42.2307 33.5247 33.3372C42.3545 24.4485 48.5895 12.3533 48.5895 0L37.7929 0.000186511Z" fill="white"/>
      <path d="M37.7929 0.000186511C37.7929 8.81036 33.2308 18.311 25.8642 25.7269C18.5021 33.138 9.00902 37.7926 0 37.7926L3.9085e-05 48.5901C12.5865 48.5901 24.6901 42.2307 33.5247 33.3372C42.3545 24.4485 48.5895 12.3533 48.5895 0L37.7929 0.000186511Z" fill="#0F0F10"/>
      <path d="M48.5895 0C48.5895 9.04185 53.1652 18.5357 60.5058 25.8763C67.8464 33.2169 77.3403 37.7918 86.3822 37.7918L86.3822 48.5894C73.8286 48.5893 61.7267 42.3674 52.8707 33.5113C44.0147 24.6553 37.7929 12.5538 37.7929 0.000186511L48.5895 0Z" fill="url(#paint0_linear_temp_logo)"/>
      <defs>
        <linearGradient id="paint0_linear_temp_logo" x1="39.0554" y1="4.24454" x2="82.8" y2="46.8675" gradientUnits="userSpaceOnUse">
          <stop stopColor="#897EED"/>
          <stop offset="1" stopColor="#6D23ED"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function TemporaryLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // 이미 로그인되어 있으면 스캔 페이지로 이동
  useEffect(() => {
    const token = localStorage.getItem('tempAccessToken');
    if (token) {
      navigate('/temporary/scan');
    }
  }, [navigate]);

  // 페이지 로드 시 이메일 입력 필드에 자동 포커스
  useEffect(() => {
    if (emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, []);

  const loginMutation = useMutation({
    mutationFn: temporaryAttendanceService.login,
    onSuccess: (data) => {
      localStorage.setItem('tempAccessToken', data.accessToken);
      localStorage.setItem('tempRefreshToken', data.refreshToken);
      navigate('/temporary/scan');
    },
    onError: () => {
      setError('로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.');
      // 에러 발생 시 비밀번호 초기화 후 비밀번호 필드에 포커스
      setPassword('');
      if (passwordInputRef.current) {
        passwordInputRef.current.focus();
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setError('');
    loginMutation.mutate({ email: email.trim(), password });
  };

  // 이메일 입력 후 엔터 시 비밀번호로 이동
  const handleEmailKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      passwordInputRef.current?.focus();
    }
  };

  return (
    <div className="temp-login-page">
      <div className="temp-login-content">
        <form className="temp-login-form" onSubmit={handleSubmit}>
          <div className="temp-form-header">
            <div className="temp-logo-icon-large">
              <LogoIcon />
            </div>
            <h1 className="temp-brand-title">Qvick</h1>
            <p className="temp-brand-subtitle">임시 출석 체크</p>
          </div>

          <div className="temp-form-body">
            {error && (
              <div className="temp-error-message" role="alert">
                {error}
              </div>
            )}

            <div className="temp-input-group">
              <div className="temp-input-wrapper">
                <label htmlFor="email" className="temp-input-label">이메일</label>
                <input
                  ref={emailInputRef}
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  className="temp-input-field"
                  placeholder="example@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleEmailKeyDown}
                  disabled={loginMutation.isPending}
                  required
                />
              </div>

              <div className="temp-input-wrapper">
                <label htmlFor="password" className="temp-input-label">비밀번호</label>
                <input
                  ref={passwordInputRef}
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="temp-input-field"
                  placeholder="비밀번호 입력"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loginMutation.isPending}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="temp-login-button"
              disabled={loginMutation.isPending || !email.trim() || !password.trim()}
            >
              {loginMutation.isPending ? (
                <span className="temp-loading-spinner"></span>
              ) : (
                '로그인'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
