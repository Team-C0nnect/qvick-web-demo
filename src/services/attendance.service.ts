import apiClient from '../lib/api-client';
import type {
  AttendanceResponse,
  AttendanceType,
  UpdateAttendancesRequest,
} from '../types/api';

export const attendanceService = {
  getAttendances: async (date?: string): Promise<AttendanceResponse[]> => {
    const response = await apiClient.get<AttendanceResponse[]>('/teacher/attendances', {
      params: { date },
    });
    return response.data;
  },

  updateAttendances: async (data: UpdateAttendancesRequest): Promise<void> => {
    await apiClient.patch('/teacher/attendances/bulk', data);
  },

  exportAttendances: async (
    date?: string,
    attendanceType?: AttendanceType,
  ): Promise<Blob> => {
    const response = await apiClient.get('/teacher/attendances/export', {
      params: { date, attendanceType },
      responseType: 'blob',
    });
    return response.data;
  },
};
