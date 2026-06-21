import apiClient from '../lib/api-client';
import type {
  AttendanceResponse,
  UpdateAttendancesRequest,
} from '../types/api';
import { withTemporarySleepoverAttendances } from './temporary-sleepover-dummy';

export const attendanceService = {
  getAttendances: async (date?: string): Promise<AttendanceResponse[]> => {
    const response = await apiClient.get<AttendanceResponse[]>('/teacher/attendances', {
      params: { date },
    });
    return withTemporarySleepoverAttendances(response.data, date);
  },

  updateAttendances: async (data: UpdateAttendancesRequest): Promise<void> => {
    await apiClient.patch('/teacher/attendances/bulk', data);
  },

  exportAttendances: async (date?: string): Promise<Blob> => {
    const response = await apiClient.get('/teacher/attendances/export', {
      params: { date },
      responseType: 'blob',
    });
    return response.data;
  },
};
