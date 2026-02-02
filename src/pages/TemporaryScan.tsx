import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { useMutation } from '@tanstack/react-query';
import { temporaryAttendanceService } from '../services/temporary-attendance.service';
import '../styles/TemporaryScan.css';

function LogoIcon() {
  return (
    <svg viewBox="0 0 87 87" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <path d="M48.59 86.3644C48.5604 77.3388 53.1267 67.8702 60.476 60.5369C67.8247 53.2043 77.3438 48.6201 86.4 48.5904L86.3647 37.7915C73.8271 37.8326 61.7151 44.0464 52.8491 52.8929C43.9837 61.739 37.7513 73.8314 37.7925 86.3998L48.59 86.3644Z" fill="#0F0F10"/>
      <path d="M48.5898 86.382C48.5897 73.8285 42.3675 61.7266 33.5116 52.8706C24.6555 44.0147 12.5536 37.7926 0 37.7926L3.9085e-05 48.5901C9.04186 48.5901 18.5359 53.1652 25.8765 60.5057C33.217 67.8463 37.7922 77.3403 37.7923 86.3821L48.5898 86.382Z" fill="#0F0F10"/>
      <path d="M37.7929 0.000186511C37.7929 8.81036 33.2308 18.311 25.8642 25.7269C18.5021 33.138 9.00902 37.7926 0 37.7926L3.9085e-05 48.5901C12.5865 48.5901 24.6901 42.2307 33.5247 33.3372C42.3545 24.4485 48.5895 12.3533 48.5895 0L37.7929 0.000186511Z" fill="white"/>
      <path d="M37.7929 0.000186511C37.7929 8.81036 33.2308 18.311 25.8642 25.7269C18.5021 33.138 9.00902 37.7926 0 37.7926L3.9085e-05 48.5901C12.5865 48.5901 24.6901 42.2307 33.5247 33.3372C42.3545 24.4485 48.5895 12.3533 48.5895 0L37.7929 0.000186511Z" fill="#0F0F10"/>
      <path d="M48.5895 0C48.5895 9.04185 53.1652 18.5357 60.5058 25.8763C67.8464 33.2169 77.3403 37.7918 86.3822 37.7918L86.3822 48.5894C73.8286 48.5893 61.7267 42.3674 52.8707 33.5113C44.0147 24.6553 37.7929 12.5538 37.7929 0.000186511L48.5895 0Z" fill="url(#paint0_linear_scan)"/>
      <defs>
        <linearGradient id="paint0_linear_scan" x1="39.0554" y1="4.24454" x2="82.8" y2="46.8675" gradientUnits="userSpaceOnUse">
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
  const [isCompleted, setIsCompleted] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const hasScannedRef = useRef(false);
  const navigate = useNavigate();

  // 인증 체크
  useEffect(() => {
    const token = localStorage.getItem('tempAccessToken');
    if (!token) {
      navigate('/temporary/login');
    }
  }, [navigate]);

  // QR 출석 mutation
  const attendanceMutation = useMutation({
    mutationFn: async (qrData: string) => {
      try {
        const response = await temporaryAttendanceService.checkAttendance({
          code: qrData,
        });
        return response;
      } catch (error: any) {
        if (error.response?.status === 409) {
          return {
            status: 409,
            message: error.response?.data?.message || '이미 출석이 완료되었습니다.',
          };
        }
        throw error;
      }
    },
    onSuccess: (response) => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
      }
      if (response.status === 409) {
        setSuccess('이미 출석이 완료되었습니다.');
      } else {
        setSuccess(response.message || '출석이 완료되었습니다!');
      }
      setError('');
      setIsCompleted(true);
    },
    onError: (err: any) => {
      let errorMessage = '출석 처리 중 오류가 발생했습니다.';
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message && !err.message.includes('status code')) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      setSuccess('');
      setTimeout(() => {
        hasScannedRef.current = false;
        setError('');
      }, 3000);
    },
  });

  // QR 스캐너 초기화
  useEffect(() => {
    if (isCompleted) return;

    const initializeScanner = async () => {
      let videoConstraints: MediaTrackConstraints = {
        facingMode: { exact: "environment" }
      };

      try {
        // 사용 가능한 카메라 목록 조회
        const cameras = await Html5Qrcode.getCameras();

        if (cameras && cameras.length > 0) {
          // 후면 카메라 중 메인 카메라 찾기 (초광각 제외)
          const backCameras = cameras.filter(camera => {
            const label = camera.label.toLowerCase();
            return (label.includes('back') || label.includes('rear')) &&
                   !label.includes('ultra') &&
                   !label.includes('wide');
          });

          // 메인 후면 카메라가 없으면 모든 후면 카메라 시도
          const selectedCamera = backCameras[0] ||
            cameras.find(camera => {
              const label = camera.label.toLowerCase();
              return label.includes('back') || label.includes('rear');
            });

          if (selectedCamera) {
            videoConstraints = {
              deviceId: { exact: selectedCamera.id }
            };
          }
        }
      } catch (error) {
        console.warn('Failed to enumerate cameras, using fallback', error);
      }

      // 스캐너 초기화
      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        {
          fps: 10,
          qrbox: { width: 280, height: 280 },
          aspectRatio: 1.0,
          videoConstraints
        },
        false
      );

      scanner.render(
        (decodedText) => {
          if (!hasScannedRef.current && !isCompleted) {
            hasScannedRef.current = true;
            attendanceMutation.mutate(decodedText);
          }
        },
        () => {}
      );

      scannerRef.current = scanner;
      setIsScanning(true);
    };

    initializeScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, [isCompleted]);

  const handleLogout = () => {
    localStorage.removeItem('tempAccessToken');
    localStorage.removeItem('tempRefreshToken');
    navigate('/temporary/login');
  };

  // 완료 화면
  if (isCompleted) {
    return (
      <div className="temp-scan-page">
        <div className="temp-scan-fullscreen">
          <div className="temp-completed-container">
            <div className="temp-completed-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/>
              </svg>
            </div>
            <h1 className="temp-completed-title">출석 완료</h1>
            <p className="temp-completed-message">{success}</p>
            <button onClick={handleLogout} className="temp-action-button">
              로그아웃
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 스캔 화면
  return (
    <div className="temp-scan-page">
      <div className="temp-scan-fullscreen">
        {/* 상단 로고 및 로그아웃 */}
        <header className="temp-scan-header">
          <div className="temp-header-logo">
            <div className="temp-logo-icon">
              <LogoIcon />
            </div>
            <span className="temp-logo-text">Qvick</span>
          </div>
          <button onClick={handleLogout} className="temp-header-logout">
            로그아웃
          </button>
        </header>

        {/* QR 스캔 영역 */}
        <main className="temp-scan-main">
          <div className="temp-scan-title">
            <h1>QR 코드 스캔</h1>
            <p>기숙사 QR 코드를 카메라에 비춰주세요</p>
          </div>

          {error && (
            <div className="temp-scan-error" role="alert">
              {error}
            </div>
          )}

          <div className="temp-qr-container">
            <div id="qr-reader" className="temp-qr-scanner"></div>
            {!isScanning && (
              <div className="temp-qr-loading">
                <div className="temp-loading-spinner"></div>
                <p>카메라 준비 중...</p>
              </div>
            )}
          </div>

          <p className="temp-scan-hint">
            카메라 권한을 허용하면 자동으로 스캔됩니다
          </p>
        </main>
      </div>
    </div>
  );
}
