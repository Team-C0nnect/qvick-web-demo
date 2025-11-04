import apiClient from '../lib/api-client';
import type {
  StudentResponse,
  PageStudentResponse,
  StudentQueryParams,
  TeacherUpdateStudentRequest,
} from '../types/api';

export const studentService = {
  getStudents: async (params?: StudentQueryParams): Promise<PageStudentResponse> => {
    const response = await apiClient.get<PageStudentResponse>('/teacher/students', {
      params,
    });
    return response.data;
  },

  getStudent: async (studentId: number): Promise<StudentResponse> => {
    const response = await apiClient.get<StudentResponse>(`/teacher/students/${studentId}`);
    return response.data;
  },

  updateStudent: async (
    studentId: number,
    data: TeacherUpdateStudentRequest
  ): Promise<void> => {
    await apiClient.patch(`/teacher/students/${studentId}`, data);
  },

  deleteStudent: async (studentId: number): Promise<void> => {
    await apiClient.delete(`/teacher/students/${studentId}`);
  },
};
