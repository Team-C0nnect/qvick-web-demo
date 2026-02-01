import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useMutation } from '@tanstack/react-query';
import { temporaryAttendanceService } from '../services/temporary-attendance.service';
import '../styles/TemporaryScan.css';

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

export default function TemporaryScan() {
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const navigate = useNavigate();

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('tempAccessToken');
    if (!token) {
      navigate('/temporary/login');
    }
  }, [navigate]);

  // QR Code attendance mutation
  const attendanceMutation = useMutation({
    mutationFn: async (qrData: string) => {
      // QR 코드 데이터를 그대로 code로 전송
      const response = await temporaryAttendanceService.checkAttendance({
        code: qrData,
      });

      if (response.status !== 200) {
        throw new Error(response.message || '출석 처리에 실패했습니다.');
      }

      return response;
    },
    onSuccess: (response) => {
      setSuccess(response.message || '출석이 완료되었습니다!');
      setError('');

      // 3초 후 성공 메시지 초기화
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    },
    onError: (err: Error) => {
      setError(err.message || '출석 처리 중 오류가 발생했습니다.');
      setSuccess('');
    },
  });

  useEffect(() => {
    // QR Scanner 초기화
    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        // 후면 카메라 우선 선택
        facingMode: { exact: "environment" },
        // 대체 설정 (후면 카메라가 없을 경우)
        videoConstraints: {
          facingMode: "environment"
        }
      },
      false
    );

    scanner.render(
      (decodedText) => {
        attendanceMutation.mutate(decodedText);
      },
      (errorMessage) => {
        // QR 스캔 실패는 무시 (계속 스캔)
        console.debug('QR scan error:', errorMessage);
      }
    );

    scannerRef.current = scanner;

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('tempAccessToken');
    localStorage.removeItem('tempRefreshToken');
    navigate('/temporary/login');
  };

  return (
    <div className="temp-scan-page">
      <header className="temp-scan-header">
        <Link to="/" className="temp-logo-container">
          <div className="temp-logo-icon">
            <HeaderLogoIcon />
          </div>
          <h1 className="temp-logo-text">Qvick</h1>
        </Link>
        <button onClick={handleLogout} className="temp-logout-button">
          로그아웃
        </button>
      </header>

      <div className="temp-scan-content">
        <div className="temp-scan-main">
          <div className="temp-scan-title-section">
            <h2 className="temp-page-title">QR 출석 체크</h2>
            <p className="temp-page-subtitle">QR 코드를 카메라에 비춰주세요</p>
          </div>

          {success && (
            <div className="temp-success-message">
              <div className="temp-success-icon">✓</div>
              <p>{success}</p>
            </div>
          )}

          {error && (
            <div className="temp-error-message">
              <p>{error}</p>
            </div>
          )}

          <div className="temp-qr-wrapper">
            <div id="qr-reader" className="temp-qr-reader"></div>
          </div>

          <div className="temp-scan-instructions">
            <p>카메라 권한을 허용한 후 QR 코드를 스캔하세요</p>
            <p className="temp-instruction-detail">출석이 자동으로 처리됩니다</p>
          </div>
        </div>
      </div>
    </div>
  );
}
