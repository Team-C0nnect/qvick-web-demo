import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
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
  const [cameraError, setCameraError] = useState<string>('');
  const [needsPermission, setNeedsPermission] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasScannedRef = useRef(false);
  const isMountedRef = useRef(true);
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
      // 스캐너 정지
      stopScanner();
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
      } else if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        errorMessage = '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.';
      } else if (err.message && !err.message.includes('status code')) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      setSuccess('');
      // 에러 발생 시 3초 후 다시 스캔 가능하도록
      setTimeout(() => {
        if (isMountedRef.current) {
          hasScannedRef.current = false;
          setError('');
        }
      }, 3000);
    },
  });

  // 스캐너 정지 함수
  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const scanner = scannerRef.current;
        scannerRef.current = null; // 먼저 ref를 null로 설정하여 중복 호출 방지
        const state = scanner.getState();
        // Html5QrcodeScannerState: NOT_STARTED=0, SCANNING=2, PAUSED=3
        if (state === 2 || state === 3) {
          await scanner.stop();
        }
      } catch (e) {
        // 스캐너가 이미 정지된 상태일 수 있음 - 무시
        console.warn('Scanner stop warning:', e);
      }
    }
    setIsScanning(false);
  }, []);

  // 카메라 시작 함수
  const startCamera = useCallback(async () => {
    if (isCompleted || !isMountedRef.current) return;

    setNeedsPermission(false);
    setCameraError('');

    // 기존 스캐너 정리
    await stopScanner();

    // DOM 요소 확인
    const qrReaderElement = document.getElementById('qr-reader');
    if (!qrReaderElement) {
      setCameraError('QR 리더를 초기화할 수 없습니다.');
      return;
    }

    try {
      const html5Qrcode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5Qrcode;

      // 카메라 설정 - 다양한 폴백 시도
      const cameraConfigs = [
        { facingMode: "environment" },
        { facingMode: { exact: "environment" } },
        { facingMode: "user" },
      ];

      let started = false;

      for (const cameraConfig of cameraConfigs) {
        if (started || !isMountedRef.current) break;

        try {
          await html5Qrcode.start(
            cameraConfig,
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0,
            },
            (decodedText) => {
              if (!hasScannedRef.current && !isCompleted && isMountedRef.current) {
                hasScannedRef.current = true;
                attendanceMutation.mutate(decodedText);
              }
            },
            () => {
              // QR 스캔 실패 - 무시
            }
          );
          started = true;
          if (isMountedRef.current) {
            setIsScanning(true);
            setCameraError('');
          }
        } catch (e) {
          console.warn('Camera config failed:', cameraConfig, e);
        }
      }

      // 모든 설정 실패 시 카메라 목록에서 선택 시도
      if (!started && isMountedRef.current) {
        try {
          const cameras = await Html5Qrcode.getCameras();
          if (cameras && cameras.length > 0) {
            // 후면 카메라 우선 선택
            const backCamera = cameras.find(c =>
              c.label.toLowerCase().includes('back') ||
              c.label.toLowerCase().includes('rear') ||
              c.label.toLowerCase().includes('환경')
            ) || cameras[cameras.length - 1]; // 마지막 카메라가 보통 후면

            await html5Qrcode.start(
              backCamera.id,
              {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
              },
              (decodedText) => {
                if (!hasScannedRef.current && !isCompleted && isMountedRef.current) {
                  hasScannedRef.current = true;
                  attendanceMutation.mutate(decodedText);
                }
              },
              () => {}
            );
            started = true;
            if (isMountedRef.current) {
              setIsScanning(true);
              setCameraError('');
            }
          }
        } catch (e) {
          console.warn('Camera list fallback failed:', e);
        }
      }

      if (!started && isMountedRef.current) {
        setCameraError('카메라를 시작할 수 없습니다. 브라우저 설정에서 카메라 권한을 확인해주세요.');
      }

    } catch (err: any) {
      console.error('Camera start error:', err);
      if (isMountedRef.current) {
        if (err.name === 'NotAllowedError' || err.message?.includes('Permission')) {
          setCameraError('카메라 권한이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.');
        } else if (err.name === 'NotFoundError') {
          setCameraError('카메라를 찾을 수 없습니다.');
        } else if (err.name === 'NotReadableError') {
          setCameraError('카메라가 다른 앱에서 사용 중입니다.');
        } else {
          setCameraError('카메라를 시작할 수 없습니다. 페이지를 새로고침 해주세요.');
        }
      }
    }
  }, [isCompleted, stopScanner, attendanceMutation]);

  // 컴포넌트 마운트/언마운트 관리
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopScanner();
    };
  }, [stopScanner]);

  const handleLogout = useCallback(() => {
    stopScanner();
    localStorage.removeItem('tempAccessToken');
    localStorage.removeItem('tempRefreshToken');
    navigate('/temporary/login');
  }, [stopScanner, navigate]);

  const handleRetry = useCallback(() => {
    setCameraError('');
    setNeedsPermission(true);
  }, []);

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

          {cameraError && (
            <div className="temp-camera-error">
              <p>{cameraError}</p>
              <button onClick={handleRetry} className="temp-retry-button">
                다시 시도
              </button>
            </div>
          )}

          <div className="temp-qr-container">
            {needsPermission && !cameraError ? (
              <div className="temp-permission-request">
                <div className="temp-camera-icon">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 15.2C13.77 15.2 15.2 13.77 15.2 12C15.2 10.23 13.77 8.8 12 8.8C10.23 8.8 8.8 10.23 8.8 12C8.8 13.77 10.23 15.2 12 15.2Z" fill="currentColor"/>
                    <path d="M9 2L7.17 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4H16.83L15 2H9ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17Z" fill="currentColor"/>
                  </svg>
                </div>
                <p>카메라 권한이 필요합니다</p>
                <button onClick={startCamera} className="temp-start-button">
                  카메라 시작하기
                </button>
              </div>
            ) : (
              <>
                <div id="qr-reader" className="temp-qr-scanner"></div>
                {!isScanning && !cameraError && (
                  <div className="temp-qr-loading">
                    <div className="temp-loading-spinner"></div>
                    <p>카메라 시작 중...</p>
                  </div>
                )}
              </>
            )}
          </div>

          {isScanning && (
            <p className="temp-scan-hint">
              QR 코드가 네모 안에 들어오도록 비춰주세요
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
