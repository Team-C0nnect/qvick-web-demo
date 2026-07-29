import apiClient from '../lib/api-client';
import type {
  PhoneBoxResponse,
  PhoneBoxGender,
  CreatePhoneBoxRequest,
  UpdatePhoneBoxNameRequest,
  PhoneBoxStudentsRequest,
} from '../types/api';

export const phoneBoxService = {
  getPhoneBoxes: async (gender?: PhoneBoxGender): Promise<PhoneBoxResponse[]> => {
    const response = await apiClient.get<PhoneBoxResponse[]>('/teacher/phone-boxes', {
      params: gender ? { gender } : undefined,
    });
    return response.data;
  },

  createPhoneBox: async (data: CreatePhoneBoxRequest): Promise<void> => {
    await apiClient.post('/teacher/phone-boxes', data);
  },

  updatePhoneBoxName: async (
    boxId: number,
    data: UpdatePhoneBoxNameRequest
  ): Promise<void> => {
    await apiClient.patch(`/teacher/phone-boxes/${boxId}`, data);
  },

  deletePhoneBox: async (boxId: number): Promise<void> => {
    await apiClient.delete(`/teacher/phone-boxes/${boxId}`);
  },

  addStudents: async (boxId: number, data: PhoneBoxStudentsRequest): Promise<void> => {
    await apiClient.post(`/teacher/phone-boxes/${boxId}/students`, data);
  },

  removeStudents: async (boxId: number, data: PhoneBoxStudentsRequest): Promise<void> => {
    await apiClient.post(`/teacher/phone-boxes/${boxId}/students/remove`, data);
  },
};
