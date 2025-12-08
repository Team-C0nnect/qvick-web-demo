import apiClient from '../lib/api-client';
import type { LoginRequest, JwtPayload, ReissueRequest } from '../types/api';
import { legacyAttendanceService } from './legacy-attendance.service';

export const authService = {
  login: async (data: LoginRequest): Promise<JwtPayload> => {
    const response = await apiClient.post<JwtPayload>('/auth/login', data);
    
    // 신버전 로그인 성공 시 구버전에도 자동 로그인
    legacyAttendanceService.login().catch((err) => {
      console.warn('Legacy login failed:', err);
    });
    
    return response.data;
  },

  reissue: async (data: ReissueRequest): Promise<JwtPayload> => {
    const response = await apiClient.post<JwtPayload>('/auth/reissue', data);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
};
