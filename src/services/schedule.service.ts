import apiClient from '../lib/api-client';
import type {
  AttendanceScheduleResponse,
  TeacherCreateAttendanceScheduleRequest,
  TeacherUpdateAttendanceScheduleRequest,
} from '../types/api';

export const scheduleService = {
  getSchedules: async (startDate: string, endDate: string): Promise<AttendanceScheduleResponse[]> => {
    const response = await apiClient.get<AttendanceScheduleResponse[]>(
      '/teacher/attendance/schedules',
      {
        params: { startDate, endDate },
      }
    );
    return response.data;
  },

  getScheduleByDate: async (date: string): Promise<AttendanceScheduleResponse> => {
    const response = await apiClient.get<AttendanceScheduleResponse>(
      '/teacher/attendance/schedules/date',
      {
        params: { date },
      }
    );
    return response.data;
  },

  getMonthSchedules: async (year: number, month: number): Promise<AttendanceScheduleResponse[]> => {
    const response = await apiClient.get<AttendanceScheduleResponse[]>(
      '/teacher/attendance/schedules/calendar/month',
      {
        params: { year, month },
      }
    );
    return response.data;
  },

  getWeekSchedules: async (date: string): Promise<AttendanceScheduleResponse[]> => {
    const response = await apiClient.get<AttendanceScheduleResponse[]>(
      '/teacher/attendance/schedules/calendar/week',
      {
        params: { date },
      }
    );
    return response.data;
  },

  createSchedule: async (data: TeacherCreateAttendanceScheduleRequest): Promise<void> => {
    await apiClient.post('/teacher/attendance/schedules', data);
  },

  updateSchedule: async (
    date: string,
    data: TeacherUpdateAttendanceScheduleRequest
  ): Promise<void> => {
    await apiClient.patch('/teacher/attendance/schedules/date', data, {
      params: { date },
    });
  },

  deleteSchedule: async (date: string): Promise<void> => {
    await apiClient.delete('/teacher/attendance/schedules', {
      params: { date },
    });
  },
};
