import apiClient from '../lib/api-client';
import type {
  BulkUpdateSleepoverPinsRequest,
  CreateSleepoverPinRequest,
  CreateSleepoverPinResponse,
  CreateSleepoverRequest,
  PageSleepoverPinResponse,
  PageSleepoverResponse,
  SyncSleepoversResponse,
} from '../types/api';

type SleepoverQueryParams = {
  page?: number;
  size?: number;
};

type SleepoverPinQueryParams = SleepoverQueryParams & {
  studentId?: number;
};

type Page<T> = {
  content: T[];
  numberOfElements: number;
  totalPages: number;
  size: number;
  last: boolean;
  empty: boolean;
};

const SLEEPOVER_PAGE_SIZE = 100;

/** 첫 페이지를 받은 뒤 남은 페이지를 모두 받아 하나의 페이지로 합칩니다. */
const fetchAllPages = async <T, P extends Page<T>>(
  fetchPage: (params: SleepoverQueryParams) => Promise<P>,
): Promise<P> => {
  const firstPage = await fetchPage({ page: 0, size: SLEEPOVER_PAGE_SIZE });

  if (firstPage.last || firstPage.totalPages <= 1) return firstPage;

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
      fetchPage({ page: index + 1, size: firstPage.size }),
    ),
  );

  return {
    ...firstPage,
    content: [
      ...firstPage.content,
      ...remainingPages.flatMap((page) => page.content),
    ],
    numberOfElements:
      firstPage.numberOfElements +
      remainingPages.reduce((total, page) => total + page.numberOfElements, 0),
    last: remainingPages.at(-1)?.last ?? firstPage.last,
    empty: firstPage.empty && remainingPages.every((page) => page.empty),
  };
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

  getAllSleepovers: (date: string): Promise<PageSleepoverResponse> =>
    fetchAllPages((params) => sleepoverService.getSleepovers(date, params)),

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

  // ===== 고정 외박 (기간 단위) =====
  getSleepoverPins: async (
    params?: SleepoverPinQueryParams,
  ): Promise<PageSleepoverPinResponse> => {
    const response = await apiClient.get<PageSleepoverPinResponse>(
      '/teacher/sleepovers/pins',
      { params },
    );
    return response.data;
  },

  getAllSleepoverPins: (studentId?: number): Promise<PageSleepoverPinResponse> =>
    fetchAllPages((params) =>
      sleepoverService.getSleepoverPins({ ...params, studentId }),
    ),

  createSleepoverPin: async (
    data: CreateSleepoverPinRequest,
  ): Promise<CreateSleepoverPinResponse> => {
    const response = await apiClient.post<CreateSleepoverPinResponse>(
      '/teacher/sleepovers/pins',
      data,
    );
    return response.data;
  },

  bulkUpdateSleepoverPins: async (
    data: BulkUpdateSleepoverPinsRequest,
  ): Promise<void> => {
    await apiClient.patch('/teacher/sleepovers/pins/bulk', data);
  },

  deleteSleepoverPin: async (pinId: number): Promise<void> => {
    await apiClient.delete(`/teacher/sleepovers/pins/${pinId}`);
  },
};
