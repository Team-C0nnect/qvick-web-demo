import apiClient from '../lib/api-client';
import type {
  CreateSleepoverRequest,
  PageSleepoverResponse,
  SyncSleepoversResponse,
} from '../types/api';

export const sleepoverService = {
  getSleepovers: async (date: string): Promise<PageSleepoverResponse> => {
    const response = await apiClient.get<PageSleepoverResponse>(
      '/teacher/sleepovers',
      {
        params: { date },
      },
    );
    return response.data;
  },

  createSleepover: async (data: CreateSleepoverRequest): Promise<void> => {
    await apiClient.post('/teacher/sleepovers', data);
  },

  syncSleepovers: async (date: string): Promise<SyncSleepoversResponse> => {
    const response = await apiClient.post<SyncSleepoversResponse>(
      '/teacher/sleepovers/sync',
      undefined,
      {
        params: { date },
      },
    );
    return response.data;
  },

  deleteSleepover: async (studentId: number, date: string): Promise<void> => {
    await apiClient.delete(`/teacher/sleepovers/${studentId}`, {
      params: { date },
    });
  },
};
