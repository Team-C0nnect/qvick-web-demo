import { authenticatedFetch } from '../lib/auth-fetch';

export interface RefineAnnouncementRequest {
  content: string;
}

export interface RefineAnnouncementResponse {
  refinedContent: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export const aiService = {
  refineAnnouncement: async (content: string): Promise<string> => {
    const response = await authenticatedFetch('/api/refineAnnouncement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) throw new Error('공지사항 다듬기에 실패했습니다.');
    const data = await response.json() as RefineAnnouncementResponse;
    return data.refinedContent;
  },
};
