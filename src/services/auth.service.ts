import apiClient from '../lib/api-client';
import type { LoginRequest, JwtPayload, ReissueRequest } from '../types/api';

export const authService = {
  login: async (data: LoginRequest): Promise<JwtPayload> => {
    const response = await apiClient.post<JwtPayload>('/auth/login', data);
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
