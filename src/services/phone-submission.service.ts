import apiClient from '../lib/api-client';
import type {
  PhoneSubmissionResponse,
  UpdatePhoneSubmissionsRequest,
} from '../types/api';
import { withTemporarySleepoverPhoneSubmissions } from './temporary-sleepover-dummy';

export const phoneSubmissionService = {
  getPhoneSubmissions: async (
    date?: string,
  ): Promise<PhoneSubmissionResponse[]> => {
    const response = await apiClient.get<PhoneSubmissionResponse[]>(
      '/teacher/phone-submissions',
      {
        params: { date },
      },
    );
    return withTemporarySleepoverPhoneSubmissions(response.data, date);
  },

  updatePhoneSubmissions: async (
    data: UpdatePhoneSubmissionsRequest,
  ): Promise<void> => {
    await apiClient.patch('/teacher/phone-submissions/bulk', data);
  },
};
