import axios from 'axios';

export class NormalizedApiError extends Error {
  constructor(
    readonly code: string,
    readonly translationKey: string,
    readonly translationParams: Record<string, unknown>,
    readonly data: unknown,
    readonly correlationId?: string,
    readonly status?: number,
  ) {
    super(code);
    this.name = 'NormalizedApiError';
  }
}

interface ApiErrorPayload {
  code?: unknown;
  translationKey?: unknown;
  translationParams?: unknown;
  data?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeApiError(error: unknown): NormalizedApiError {
  if (!axios.isAxiosError<ApiErrorPayload>(error)) {
    return new NormalizedApiError('UNKNOWN_ERROR', 'apiErrors.UNKNOWN_ERROR', {}, undefined);
  }

  const payload = error.response?.data;
  const code = typeof payload?.code === 'string' ? payload.code : 'HTTP_ERROR';
  const translationKey =
    typeof payload?.translationKey === 'string' ? payload.translationKey : `apiErrors.${code}`;
  const responseHeaders: unknown = error.response?.headers;
  const correlationHeader = isRecord(responseHeaders)
    ? responseHeaders['x-correlation-id']
    : undefined;

  return new NormalizedApiError(
    code,
    translationKey,
    isRecord(payload?.translationParams) ? payload.translationParams : {},
    payload?.data,
    typeof correlationHeader === 'string' ? correlationHeader : undefined,
    error.response?.status,
  );
}
