import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/api-client';
import {
  mockUser,
  mockAttendances,
  mockStudentPage,
  mockAnnouncementPage,
  getMockAnnouncementDetail,
  getMockMonthSchedules,
  mockRooms,
} from './mock-data';
import type { InternalAxiosRequestConfig, AxiosResponse } from 'axios';

interface DemoContextValue {
  isDemo: boolean;
  enterDemo: () => void;
  exitDemo: () => void;
}

const DemoContext = createContext<DemoContextValue>({
  isDemo: false,
  enterDemo: () => {},
  exitDemo: () => {},
});

export const useDemoMode = () => useContext(DemoContext);

// ──────────────────── Mock Adapter ────────────────────

function buildResponse(data: unknown, config: InternalAxiosRequestConfig): AxiosResponse {
  return { data, status: 200, statusText: 'OK', headers: {}, config };
}

function routeMock(config: InternalAxiosRequestConfig): AxiosResponse | null {
  const url = config.url || '';
  const method = (config.method || 'get').toLowerCase();

  // ── GET routes ──
  if (method === 'get') {
    if (url.includes('/users/my')) return buildResponse(mockUser, config);
    if (url.includes('/teacher/attendances')) return buildResponse(mockAttendances, config);
    if (url.includes('/teacher/students')) return buildResponse(mockStudentPage, config);

    // Announcement detail  /announcements/{id}
    const announcementMatch = url.match(/\/announcements\/(\d+)$/);
    if (announcementMatch) return buildResponse(getMockAnnouncementDetail(Number(announcementMatch[1])), config);
    if (url.includes('/announcements')) return buildResponse(mockAnnouncementPage, config);

    // Schedules
    if (url.includes('/attendance/schedules/calendar/month')) {
      const params = config.params || {};
      const year = params.year || new Date().getFullYear();
      const month = params.month || new Date().getMonth() + 1;
      return buildResponse(getMockMonthSchedules(year, month), config);
    }
    if (url.includes('/attendance/schedules')) return buildResponse([], config);

    if (url.includes('/teacher/rooms')) return buildResponse(mockRooms, config);

    // Patchnotes (public)
    if (url.includes('/patchnotes') || url.includes('/patchnote')) return buildResponse([], config);
    if (url.includes('/inquiries')) return buildResponse([], config);
  }

  // ── Mutation routes (POST/PATCH/DELETE) — 성공 응답만 반환 ──
  if (method === 'post' || method === 'patch' || method === 'delete') {
    return buildResponse({ success: true }, config);
  }

  // 매칭 안 되면 빈 응답
  return buildResponse({}, config);
}

let originalAdapter: typeof apiClient.defaults.adapter | null = null;

function installMockAdapter() {
  if (originalAdapter) return; // 이미 설치됨
  originalAdapter = apiClient.defaults.adapter;
  apiClient.defaults.adapter = (config) => {
    return new Promise((resolve) => {
      // 약간의 딜레이로 로딩 스켈레톤 표시 효과
      setTimeout(() => {
        resolve(routeMock(config as InternalAxiosRequestConfig) as AxiosResponse);
      }, 150);
    });
  };
}

function removeMockAdapter() {
  if (originalAdapter) {
    apiClient.defaults.adapter = originalAdapter;
    originalAdapter = null;
  }
}

// ──────────────────── Provider ────────────────────

const DEMO_KEY = 'qvick_demo_mode';

export function DemoProvider({ children }: { children: ReactNode }) {
  const [isDemo, setIsDemo] = useState(() => sessionStorage.getItem(DEMO_KEY) === 'true');
  const navigate = useNavigate();

  // 데모 모드 진입 시 mock adapter 설치
  useEffect(() => {
    if (isDemo) {
      installMockAdapter();
      if (!localStorage.getItem('accessToken')) {
        localStorage.setItem('accessToken', 'demo-token');
      }
    }
    return () => {
      if (isDemo) {
        removeMockAdapter();
      }
    };
  }, [isDemo]);

  const enterDemo = useCallback(() => {
    sessionStorage.setItem(DEMO_KEY, 'true');
    localStorage.setItem('accessToken', 'demo-token');
    installMockAdapter();
    setIsDemo(true);
    navigate('/');
  }, [navigate]);

  const exitDemo = useCallback(() => {
    sessionStorage.removeItem(DEMO_KEY);
    removeMockAdapter();
    // demo 토큰만 제거
    if (localStorage.getItem('accessToken') === 'demo-token') {
      localStorage.removeItem('accessToken');
    }
    setIsDemo(false);
    navigate('/preview');
  }, [navigate]);

  return (
    <DemoContext.Provider value={{ isDemo, enterDemo, exitDemo }}>
      {children}
    </DemoContext.Provider>
  );
}

export default DemoContext;
