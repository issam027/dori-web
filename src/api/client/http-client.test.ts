import { delay, http, HttpResponse } from 'msw';
import { clearAccessToken, getAccessToken, setAccessToken } from '@/core/auth/access-token';
import type { NormalizedApiError } from '@/core/errors/normalized-api-error';
import { httpClient, request } from './http-client';
import { mockServer } from '@/shared/testing/mock-server';

describe('httpClient', () => {
  afterEach(() => {
    clearAccessToken();
  });

  it('shares one refresh request between concurrent 401 responses', async () => {
    let refreshCalls = 0;
    let protectedCalls = 0;
    const correlationIds: string[] = [];

    mockServer.use(
      http.get('http://localhost:3000/protected', ({ request: incomingRequest }) => {
        protectedCalls += 1;
        correlationIds.push(incomingRequest.headers.get('x-correlation-id') ?? '');
        if (incomingRequest.headers.get('authorization') !== 'Bearer renewed-token') {
          return HttpResponse.json(
            { code: 'TOKEN_EXPIRED', translationParams: {} },
            { status: 401 },
          );
        }
        return HttpResponse.json({ ok: true });
      }),
      http.post('http://localhost:3000/api/v1/auth/refresh', async () => {
        refreshCalls += 1;
        await delay(25);
        return HttpResponse.json({
          code: 'OK',
          translationKey: null,
          translationParams: {},
          data: { accessToken: 'renewed-token' },
        });
      }),
    );
    setAccessToken('expired-token');

    const responses = await Promise.all([
      request<{ ok: boolean }>({ url: '/protected', method: 'GET' }),
      request<{ ok: boolean }>({ url: '/protected', method: 'GET' }),
    ]);

    expect(responses).toEqual([{ ok: true }, { ok: true }]);
    expect(refreshCalls).toBe(1);
    expect(protectedCalls).toBe(4);
    expect(getAccessToken()).toBe('renewed-token');
    expect(correlationIds.every(Boolean)).toBe(true);
  });

  it('normalizes API errors and propagates the correlation id', async () => {
    mockServer.use(
      http.get('http://localhost:3000/broken', () =>
        HttpResponse.json(
          {
            code: 'INVALID_STATE',
            translationKey: 'errors.invalid_state',
            translationParams: { state: 'closed' },
            data: { retryable: true },
          },
          { status: 409, headers: { 'X-Correlation-Id': 'correlation-123' } },
        ),
      ),
    );

    const error = await httpClient
      .get('/broken')
      .catch((reason: unknown) => reason as NormalizedApiError);

    expect(error).toMatchObject({
      code: 'INVALID_STATE',
      translationKey: 'errors.invalid_state',
      translationParams: { state: 'closed' },
      data: { retryable: true },
      correlationId: 'correlation-123',
      status: 409,
    });
  });

  it('normalizes a forbidden response with a fallback translation key', async () => {
    mockServer.use(
      http.get('http://localhost:3000/forbidden', () =>
        HttpResponse.json({ code: 'FORBIDDEN', translationParams: {} }, { status: 403 }),
      ),
    );

    const error = await httpClient
      .get('/forbidden')
      .catch((reason: unknown) => reason as NormalizedApiError);

    expect(error).toMatchObject({
      code: 'FORBIDDEN',
      translationKey: 'apiErrors.FORBIDDEN',
      status: 403,
    });
  });
});
