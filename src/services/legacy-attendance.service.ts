import axios from 'axios';

// 구버전 API (api.qvick.xyz) 응답 타입
export interface LegacyUserResponse {
  email: string;
  name: string;
  stdId: string;      // 학번 (예: "3417")
  room: string;       // 방 번호 (예: "510")
  userRole: string;   // "USER" | "TEACHER" | "ADMIN"
  phoneNum?: string;
  gender?: 'MALE' | 'FEMALE';  // 성별
  checked?: boolean;  // 출석 여부
  checkedDate?: string; // 출석 시간
}

export interface LegacyApiResponse {
  status: number;
  message: string;
  data: LegacyUserResponse[];
}

interface LegacyLoginResponse {
  status: number;
  message: string;
  data: {
    accessToken: string;
    refreshToken: string;
    userRole: string;
  };
}

// 구버전 API 클라이언트
const legacyApiClient = axios.create({
  baseURL: 'https://api.qvick.xyz',
  timeout: 10000,
});

// 구버전 인증 정보 (정적)
const LEGACY_CREDENTIALS = {
  email: 'test@qvick.xyz',
  password: 'qvick1234',
};

// 구버전 토큰 저장
let legacyAccessToken: string | null = null;
let legacyRefreshToken: string | null = null;

/**
 * 구버전 서버 로그인 (신버전 로그인 시 자동 호출)
 */
const loginToLegacy = async (): Promise<boolean> => {
  try {
    const response = await legacyApiClient.post<LegacyLoginResponse>('/auth/sign-in', LEGACY_CREDENTIALS);
    
    if (response.data.status === 200 && response.data.data.accessToken) {
      legacyAccessToken = response.data.data.accessToken;
      legacyRefreshToken = response.data.data.refreshToken;
      // 요청 인터셉터에 토큰 설정
      legacyApiClient.defaults.headers.common['Authorization'] = `Bearer ${legacyAccessToken}`;
      console.log('Legacy API login successful');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Legacy API login error:', error);
    return false;
  }
};

/**
 * 구버전 토큰 리프레시
 */
const refreshLegacyToken = async (): Promise<boolean> => {
  if (!legacyRefreshToken) {
    return false;
  }
  
  try {
    const response = await legacyApiClient.post<LegacyLoginResponse>('/auth/refresh', {
      refreshToken: legacyRefreshToken,
    });
    
    if (response.data.status === 200 && response.data.data.accessToken) {
      legacyAccessToken = response.data.data.accessToken;
      legacyRefreshToken = response.data.data.refreshToken;
      legacyApiClient.defaults.headers.common['Authorization'] = `Bearer ${legacyAccessToken}`;
      console.log('Legacy API token refreshed');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Legacy API refresh error:', error);
    return false;
  }
};

/**
 * 구버전 인증 확인 및 필요시 로그인
 */
const ensureLegacyAuth = async (): Promise<void> => {
  if (!legacyAccessToken) {
    await loginToLegacy();
  }
};

export const legacyAttendanceService = {
  /**
   * 구버전 서버 로그인 (외부에서 호출 가능)
   */
  login: loginToLegacy,
  
  /**
   * 구버전 서버에서 유저 목록(출석 정보 포함) 조회
   */
  getUserList: async (): Promise<LegacyUserResponse[]> => {
    try {
      // 인증 확인
      await ensureLegacyAuth();
      
      const response = await legacyApiClient.get<LegacyApiResponse>('/user/list', {
        params: { page: 1, size: 1000 },
      });
      
      // TEACHER 제외하고 학생만 반환
      return response.data.data.filter(
        user => user.userRole === 'USER' && user.stdId && user.room
      );
    } catch (error) {
      console.error('Legacy API error:', error);
      // 인증 실패 시 토큰 리프레시 후 재시도
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        // 먼저 리프레시 시도
        const refreshed = await refreshLegacyToken();
        if (!refreshed) {
          // 리프레시 실패 시 재로그인
          legacyAccessToken = null;
          legacyRefreshToken = null;
          await ensureLegacyAuth();
        }
        
        try {
          const retryResponse = await legacyApiClient.get<LegacyApiResponse>('/user/list', {
            params: { page: 1, size: 1000 },
          });
          return retryResponse.data.data.filter(
            user => user.userRole === 'USER' && user.stdId && user.room
          );
        } catch (retryError) {
          console.error('Legacy API retry error:', retryError);
        }
      }
      return [];
    }
  },
};
