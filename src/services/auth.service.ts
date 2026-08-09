import apiClient from '../lib/api-client';
import type { LoginRequest, JwtPayload, MyUserResponse, ReissueRequest } from '../types/api';

export const STUDENT_LOGIN_DENIED_MESSAGE = 'STUDENT_LOGIN_DENIED';

export const authService = {
  login: async (data: LoginRequest): Promise<JwtPayload> => {
    const response = await apiClient.post<JwtPayload>('/auth/login', data);
    const tokens = response.data;

    const userResponse = await apiClient.get<MyUserResponse>('/users/my', {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });

    if (userResponse.data.roles?.includes('STUDENT')) {
      throw new Error(STUDENT_LOGIN_DENIED_MESSAGE);
    }

    return tokens;
  },

  verifyPassword: async (data: LoginRequest): Promise<void> => {
    await apiClient.post<JwtPayload>('/auth/login', data);
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
