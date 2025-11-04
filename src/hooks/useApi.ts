import { useQuery } from '@tanstack/react-query';
import { studentService } from '../services/student.service';
import { attendanceService } from '../services/attendance.service';
import type { PageStudentResponse, AttendanceResponse } from '../types/api';

export const useStudents = (params?: {
  page?: number;
  size?: number;
  grade?: number;
  classroom?: number;
  room?: string;
  name?: string;
}) => {
  return useQuery<PageStudentResponse>({
    queryKey: ['students', params],
    queryFn: () => studentService.getStudents(params),
  });
};

export const useAttendances = (date?: string) => {
  return useQuery<AttendanceResponse[]>({
    queryKey: ['attendances', date],
    queryFn: () => attendanceService.getAttendances(date),
  });
};
