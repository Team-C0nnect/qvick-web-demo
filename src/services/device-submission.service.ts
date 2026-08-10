import apiClient from '../lib/api-client';
import type {
  DeviceSubmissionQueryParams,
  DeviceSubmissionResponse,
  UpdateDeviceSubmissionsRequest,
} from '../types/api';

export const deviceSubmissionService = {
  getDeviceSubmissions: async (
    params?: DeviceSubmissionQueryParams,
  ): Promise<DeviceSubmissionResponse> => {
    const response = await apiClient.get<DeviceSubmissionResponse>(
      '/teacher/device-submissions',
      {
        params,
      },
    );
    return response.data;
  },

  updateDeviceSubmissions: async (
    data: UpdateDeviceSubmissionsRequest,
  ): Promise<void> => {
    await apiClient.patch('/teacher/device-submissions/bulk', data);
  },
};
