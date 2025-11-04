import apiClient from '../lib/api-client';
import type {
  AnnouncementDetailResponse,
  PageAnnouncementResponse,
  AnnouncementQueryParams,
  CreateAnnouncementRequest,
  TeacherUpdateAnnouncementRequest,
} from '../types/api';

export const announcementService = {
  getAnnouncements: async (params?: AnnouncementQueryParams): Promise<PageAnnouncementResponse> => {
    const response = await apiClient.get<PageAnnouncementResponse>('/announcements', {
      params,
    });
    return response.data;
  },

  getAnnouncement: async (announcementId: number): Promise<AnnouncementDetailResponse> => {
    const response = await apiClient.get<AnnouncementDetailResponse>(
      `/announcements/${announcementId}`
    );
    return response.data;
  },

  createAnnouncement: async (data: CreateAnnouncementRequest): Promise<void> => {
    await apiClient.post('/teacher/announcements', null, {
      params: data,
    });
  },

  updateAnnouncement: async (
    announcementId: number,
    data: TeacherUpdateAnnouncementRequest
  ): Promise<void> => {
    await apiClient.patch(`/teacher/announcements/${announcementId}`, data);
  },

  deleteAnnouncement: async (announcementId: number): Promise<void> => {
    await apiClient.delete(`/teacher/announcements/${announcementId}`);
  },

  pinAnnouncement: async (announcementId: number): Promise<void> => {
    await apiClient.patch(`/teacher/announcements/${announcementId}/pin`);
  },

  unpinAnnouncement: async (announcementId: number): Promise<void> => {
    await apiClient.patch(`/teacher/announcements/${announcementId}/unpin`);
  },
};
