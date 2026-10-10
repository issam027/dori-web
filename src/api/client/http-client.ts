import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { clearAccessToken, getAccessToken, setAccessToken } from '@/core/auth/access-token';
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

async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post<RefreshResponse>('/api/v1/auth/refresh', {})
      .then((response) => {
        const token = response.data.data.accessToken;
        setAccessToken(token);
        return token;
      })
      .finally(() => {
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
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
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
      !isAuthenticationOperation(originalRequest.url)
    ) {
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

export type ApiError<T> = AxiosError<T>;
export type ApiBody<T> = T;
