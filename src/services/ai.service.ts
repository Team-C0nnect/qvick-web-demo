import axios from 'axios';

const azureFunctionClient = axios.create({
  baseURL: '/api', // Azure Static Web Apps는 자동으로 /api를 Functions로 라우팅
  timeout: 30000, // 30초 (OpenAI 응답 대기 시간 고려)
  headers: {
    'Content-Type': 'application/json',
  },
});

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
    const response = await azureFunctionClient.post<RefineAnnouncementResponse>(
      '/refineAnnouncement',
      { content }
    );
    return response.data.refinedContent;
  },
};
