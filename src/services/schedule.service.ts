import apiClient from '../lib/api-client';
import type {
  AttendanceScheduleResponse,
  TeacherCreateAttendanceScheduleRequest,
  TeacherUpdateAttendanceScheduleRequest,
  Gender,
  AttendanceScheduleGender,
  DayOfWeek,
  DefaultAttendanceSchedule,
  TeacherUpdateDefaultAttendanceScheduleRequest,
} from '../types/api';

interface ScheduleListResponse {
  data?: AttendanceScheduleResponse[];
  content?: AttendanceScheduleResponse[];
}

const normalizeScheduleList = (
  payload: AttendanceScheduleResponse[] | ScheduleListResponse,
): AttendanceScheduleResponse[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.content)) return payload.content;
  return [];
};

export const scheduleService = {
  getSchedules: async (
    startDate: string,
    endDate: string,
    gender?: AttendanceScheduleGender,
  ): Promise<AttendanceScheduleResponse[]> => {
    const response = await apiClient.get<AttendanceScheduleResponse[]>(
      '/teacher/attendance/schedules',
      {
        params: { startDate, endDate, gender },
      },
    );
    return response.data;
  },

  getScheduleByDate: async (
    date: string,
    gender: Gender,
  ): Promise<AttendanceScheduleResponse> => {
    const response = await apiClient.get<AttendanceScheduleResponse>(
      '/teacher/attendance/schedules/date',
      {
        params: { date, gender },
      },
    );
    return response.data;
  },

  getMonthSchedules: async (
    year: number,
    month: number,
    gender?: AttendanceScheduleGender,
  ): Promise<AttendanceScheduleResponse[]> => {
    const response = await apiClient.get<AttendanceScheduleResponse[] | ScheduleListResponse>(
      '/teacher/attendance/schedules/calendar/month',
      {
        params: { year, month, gender },
      },
    );
    return normalizeScheduleList(response.data);
  },

  getWeekSchedules: async (
    date: string,
    gender?: AttendanceScheduleGender,
  ): Promise<AttendanceScheduleResponse[]> => {
    const response = await apiClient.get<AttendanceScheduleResponse[]>(
      '/teacher/attendance/schedules/calendar/week',
      {
        params: { date, gender },
      },
    );
    return response.data;
  },

  createSchedule: async (data: TeacherCreateAttendanceScheduleRequest): Promise<void> => {
    await apiClient.post('/teacher/attendance/schedules', data);
  },

  updateSchedule: async (
    date: string,
    gender: Gender,
    data: TeacherUpdateAttendanceScheduleRequest
  ): Promise<void> => {
    await apiClient.patch('/teacher/attendance/schedules/date', data, {
      params: { date, gender },
    });
  },

  deleteSchedule: async (date: string, gender: Gender): Promise<void> => {
    await apiClient.delete('/teacher/attendance/schedules', {
      params: { date, gender },
    });
  },

  getDefaultSchedule: async (
    dayOfWeek: DayOfWeek,
    gender: AttendanceScheduleGender,
  ): Promise<DefaultAttendanceSchedule> => {
    const response = await apiClient.get<DefaultAttendanceSchedule>(
      '/teacher/attendance/schedules/default',
      { params: { dayOfWeek, gender } },
    );
    return response.data;
  },

  fillDefaultSchedules: async (
    startDate: string,
    endDate: string,
    gender?: AttendanceScheduleGender,
  ): Promise<void> => {
    await apiClient.post('/teacher/attendance/schedules/default', undefined, {
      params: { startDate, endDate, gender },
    });
  },

  updateDefaultSchedule: async (
    dayOfWeek: DayOfWeek,
    gender: AttendanceScheduleGender,
    data: TeacherUpdateDefaultAttendanceScheduleRequest,
  ): Promise<void> => {
    await apiClient.patch('/teacher/attendance/schedules/default', data, {
      params: { dayOfWeek, gender },
    });
  },
};
