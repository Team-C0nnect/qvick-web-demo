import axios from 'axios';

const TEMP_API_BASE_URL = 'https://api.qvick.xyz';

// 임시 출석 체크용 API 클라이언트
const tempApiClient = axios.create({
  baseURL: TEMP_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
tempApiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('tempAccessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

interface TempLoginRequest {
  email: string;
  password: string;
}

interface TempLoginResponse {
  status: number;
  message: string;
  data: {
    accessToken: string;
    refreshToken: string;
    userRole: string;
  };
}

interface CheckAttendanceRequest {
  code: string;
}

interface CheckAttendanceResponse {
  status: number;
  message: string;
  data?: unknown;
}

export const temporaryAttendanceService = {
  /**
   * 임시 로그인 (api.qvick.xyz)
   */
  login: async (data: TempLoginRequest): Promise<TempLoginResponse['data']> => {
    const response = await tempApiClient.post<TempLoginResponse>('/auth/sign-in', data);

    if (response.data.status === 200 && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.message || '로그인에 실패했습니다.');
  },

  /**
   * QR 코드로 출석 체크
   */
  checkAttendance: async (data: CheckAttendanceRequest): Promise<CheckAttendanceResponse> => {
    const response = await tempApiClient.post<CheckAttendanceResponse>('/check', data);
    return response.data;
  },
};
