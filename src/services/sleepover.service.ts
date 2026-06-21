import apiClient from '../lib/api-client';
import type {
  CreateSleepoverRequest,
  PageSleepoverResponse,
  SyncSleepoversResponse,
} from '../types/api';
import { withTemporarySleepoverPage } from './temporary-sleepover-dummy';

type SleepoverQueryParams = {
  page?: number;
  size?: number;
};

export const sleepoverService = {
  getSleepovers: async (
    date: string,
    params?: SleepoverQueryParams,
  ): Promise<PageSleepoverResponse> => {
    const response = await apiClient.get<PageSleepoverResponse>(
      '/teacher/sleepovers',
      {
        params: { date, ...params },
      },
    );
    return response.data;
  },

  getAllSleepovers: async (date: string): Promise<PageSleepoverResponse> => {
    const firstPage = await sleepoverService.getSleepovers(date, {
      page: 0,
      size: 1000,
    });

    if (firstPage.last || firstPage.totalPages <= 1) {
      return withTemporarySleepoverPage(firstPage, date);
    }

    const remainingPages = await Promise.all(
      Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
        sleepoverService.getSleepovers(date, {
          page: index + 1,
          size: firstPage.size,
        }),
      ),
    );

    return withTemporarySleepoverPage({
      ...firstPage,
      content: [
        ...firstPage.content,
        ...remainingPages.flatMap((page) => page.content),
      ],
      numberOfElements:
        firstPage.numberOfElements +
        remainingPages.reduce((total, page) => total + page.numberOfElements, 0),
      last: remainingPages.at(-1)?.last ?? firstPage.last,
      empty:
        firstPage.empty && remainingPages.every((page) => page.empty),
    }, date);
  },

  createSleepover: async (data: CreateSleepoverRequest): Promise<void> => {
    await apiClient.post('/teacher/sleepovers', data);
  },

  syncSleepovers: async (date: string): Promise<SyncSleepoversResponse> => {
    const response = await apiClient.post<SyncSleepoversResponse>(
      '/teacher/sleepovers/sync',
      undefined,
      {
        params: { date },
      },
    );
    return response.data;
  },

  deleteSleepover: async (studentId: number, date: string): Promise<void> => {
    await apiClient.delete(`/teacher/sleepovers/${studentId}`, {
      params: { date },
    });
  },
};
