import apiClient from '../lib/api-client';
import type {
  AnnouncementDetailResponse,
  AnnouncementResponse,
  PageAnnouncementResponse,
  AnnouncementQueryParams,
  CreateAnnouncementRequest,
  TeacherUpdateAnnouncementRequest,
} from '../types/api';

const PIN_SYNC_PAGE_SIZE = 100;

const updateAnnouncementPin = async (
  announcementId: number,
  pin: boolean,
): Promise<void> => {
  await apiClient.patch(
    `/teacher/announcements/${announcementId}/${pin ? 'pin' : 'unpin'}`,
  );
};

const getAllAnnouncements = async (): Promise<AnnouncementResponse[]> => {
  const firstResponse = await apiClient.get<PageAnnouncementResponse>(
    '/announcements',
    {
      params: { page: 0, size: PIN_SYNC_PAGE_SIZE },
    },
  );
  const firstPage = firstResponse.data;
  const remainingPageNumbers = Array.from(
    { length: Math.max(firstPage.totalPages - 1, 0) },
    (_, index) => index + 1,
  );

  const remainingResponses = await Promise.all(
    remainingPageNumbers.map((page) =>
      apiClient.get<PageAnnouncementResponse>('/announcements', {
        params: { page, size: PIN_SYNC_PAGE_SIZE },
      }),
    ),
  );

  return [
    ...firstPage.content,
    ...remainingResponses.flatMap((response) => response.data.content),
  ];
};

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
    await apiClient.post('/teacher/announcements', data);
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
    await updateAnnouncementPin(announcementId, true);
  },

  pinOnlyAnnouncement: async (announcementId: number): Promise<number[]> => {
    const pinnedAnnouncements = (await getAllAnnouncements()).filter(
      (announcement) =>
        announcement.isPinned && announcement.id !== announcementId,
    );
    const unpinnedAnnouncementIds = pinnedAnnouncements.map(
      (announcement) => announcement.id,
    );

    await Promise.all(
      unpinnedAnnouncementIds.map((pinnedAnnouncementId) =>
        updateAnnouncementPin(pinnedAnnouncementId, false),
      ),
    );
    await updateAnnouncementPin(announcementId, true);

    return unpinnedAnnouncementIds;
  },

  unpinAnnouncement: async (announcementId: number): Promise<void> => {
    await updateAnnouncementPin(announcementId, false);
  },
};
