import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

const DEFAULT_API_BASE_URL = 'https://devapi.qvick.xyz';
const envApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

if (!envApiBaseUrl) {
  console.warn(
    `VITE_API_BASE_URL is not set. Falling back to ${DEFAULT_API_BASE_URL}.`,
  );
}

const API_BASE_URL = (envApiBaseUrl || DEFAULT_API_BASE_URL).replace(/\/$/, '');

export const clearAuthTokens = () => {
  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('refreshToken');
};

let refreshPromise: Promise<string> | null = null;

export const refreshAccessToken = async (): Promise<string> => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = sessionStorage.getItem('refreshToken');
    if (!refreshToken) throw new Error('Refresh token is missing');

    const response = await axios.post(`${API_BASE_URL}/auth/reissue`, {
      refreshToken,
    });
    const { accessToken, refreshToken: newRefreshToken } = response.data;

    if (!accessToken || !newRefreshToken) {
      throw new Error('Token reissue response is invalid');
    }

    sessionStorage.setItem('accessToken', accessToken);
    sessionStorage.setItem('refreshToken', newRefreshToken);
    return accessToken as string;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = sessionStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Skip interceptor for login endpoint
    if (originalRequest?.url?.includes('/auth/login')) {
      return Promise.reject(error);
    }

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const accessToken = await refreshAccessToken();

        // Retry the original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        clearAuthTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
