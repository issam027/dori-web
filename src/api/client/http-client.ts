import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
  getSessionGeneration,
} from '@/core/auth/access-token';
import { normalizeApiError } from '@/core/errors/normalized-api-error';

// In deployed builds, API calls deliberately stay on the frontend origin.
// The Vercel function selects the development or production API and keeps the
// HttpOnly SameSite=Strict refresh cookie first-party after a page reload.
const apiBaseUrl = import.meta.env.PROD ? undefined : import.meta.env.VITE_API_BASE_URL;

export const httpClient = axios.create({
  baseURL: apiBaseUrl,
  headers: { Accept: 'application/json' },
  withCredentials: true,
});

const refreshClient = axios.create({
  baseURL: apiBaseUrl,
  headers: { Accept: 'application/json' },
  withCredentials: true,
});

interface RefreshResponse {
  data: { accessToken: string };
}

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _sharedTokenRetry?: boolean;
}

type AuthenticationExpiredListener = () => void;

let refreshPromise: Promise<string> | null = null;
const authenticationExpiredListeners = new Set<AuthenticationExpiredListener>();

function createCorrelationId(): string {
  return globalThis.crypto.randomUUID();
}

function isAuthenticationOperation(url?: string): boolean {
  return Boolean(url?.includes('/api/v1/auth/login') || url?.includes('/api/v1/auth/refresh'));
}

function isPublicOperation(url?: string): boolean {
  return Boolean(url?.includes('/api/v1/public/'));
}

export async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    const previousToken = getAccessToken();
    const run = async () => {
      const currentToken = getAccessToken();
      if (currentToken && currentToken !== previousToken) return currentToken;
      const sessionGeneration = getSessionGeneration();
      const response = await refreshClient.post<RefreshResponse>('/api/v1/auth/refresh', {});
      if (getSessionGeneration() !== sessionGeneration)
        throw new Error('Session ended during refresh');
      const token = response.data.data.accessToken;
      setAccessToken(token);
      return token;
    };
    // Refresh cookies are shared by tabs. Serialize rotation to avoid token reuse.
    const locks =
      typeof navigator === 'undefined' ? undefined : (navigator as Partial<Navigator>).locks;
    refreshPromise = (locks ? locks.request('dori:session-refresh', run) : run()).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export function onAuthenticationExpired(listener: AuthenticationExpiredListener): () => void {
  authenticationExpiredListeners.add(listener);
  return () => {
    authenticationExpiredListeners.delete(listener);
  };
}

httpClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token && !isPublicOperation(config.url))
    config.headers.set('Authorization', `Bearer ${token}`);
  if (!config.headers.has('X-Correlation-Id')) {
    config.headers.set('X-Correlation-Id', createCorrelationId());
  }
  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthenticationOperation(originalRequest.url) &&
      !isPublicOperation(originalRequest.url)
    ) {
      const sharedToken = getAccessToken();
      if (
        sharedToken &&
        !originalRequest._sharedTokenRetry &&
        originalRequest.headers.get('Authorization') !== 'Bearer ' + sharedToken
      ) {
        originalRequest._sharedTokenRetry = true;
        originalRequest.headers.set('Authorization', 'Bearer ' + sharedToken);
        return httpClient.request(originalRequest);
      }
      originalRequest._retry = true;

      try {
        const token = await refreshAccessToken();
        originalRequest.headers.set('Authorization', `Bearer ${token}`);
        return await httpClient.request(originalRequest);
      } catch (refreshError: unknown) {
        clearAccessToken();
        authenticationExpiredListeners.forEach((listener) => {
          listener();
        });
        throw normalizeApiError(refreshError);
      }
    }

    throw normalizeApiError(error);
  },
);

export async function request<T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> {
  const response = await httpClient.request<T>({ ...config, ...options });
  return response.data;
}
