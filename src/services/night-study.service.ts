import apiClient from '../lib/api-client';
import type { NightStudySyncResponse } from '../types/api';

export const nightStudyService = {
  syncNightStudies: async (date: string): Promise<NightStudySyncResponse> => {
    const response = await apiClient.post<NightStudySyncResponse>(
      '/teacher/night-studies/sync',
      undefined,
      {
        params: { date },
      },
    );
    return response.data;
  },
};
