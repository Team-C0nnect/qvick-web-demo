import apiClient from '../lib/api-client';
import type { NightStudyApplicantResponse } from '../types/api';

export const nightStudyService = {
  getNightStudyApplicants: async (
    date: string,
  ): Promise<NightStudyApplicantResponse[]> => {
    const response = await apiClient.get<NightStudyApplicantResponse[]>(
      '/teacher/night-studies',
      {
        params: { date },
      },
    );
    return response.data;
  },
};
