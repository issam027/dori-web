import { http, HttpResponse } from 'msw';
import { QueryClient } from '@tanstack/react-query';
import { mockServer } from '@/shared/testing/mock-server';
import { useScopeStore } from '@/core/scope/scope-store';
import { getAccessToken } from './access-token';
import {
  clearSession,
  expireSession,
  getRememberedUsername,
  hydrateSession,
  login,
} from './session-actions';
import { useBrandStore } from '@/core/theme/brand-store';
import { useSessionStore } from './session-store';

describe('hydrateSession', () => {
  afterEach(() => {
    useSessionStore.getState().clear();
    useScopeStore.getState().clear();
  });

  it('hydrates identity, permissions, scope and the first authorized site from /auth/me', async () => {
    mockServer.use(
      http.get('http://localhost:3000/api/v1/auth/me', () =>
        HttpResponse.json({
          code: 'OK',
          translationKey: null,
          translationParams: {},
          data: {
            userId: 7,
            username: 'sarah',
            userType: 'human',
            roles: ['operator'],
            permissions: ['queue_view'],
            mustChangePassword: false,
            scope: { isGlobal: false, siteIds: [12], queueIds: [25] },
          },
        }),
      ),
    );

    await hydrateSession();

    expect(useSessionStore.getState()).toMatchObject({
      status: 'authenticated',
      user: { userId: 7, permissions: ['queue_view'] },
    });
    expect(useScopeStore.getState().activeSiteId).toBe(12);
  });

  it('logs in, keeps only the remembered username locally and hydrates /auth/me', async () => {
    let submittedUsername = '';
    mockServer.use(
      http.post('http://localhost:3000/api/v1/auth/login', async ({ request }) => {
        submittedUsername = ((await request.json()) as { username: string }).username;
        return HttpResponse.json({
          code: 'OK',
          translationKey: null,
          translationParams: {},
          data: {
            accessToken: 'access-token',
            refreshToken: 'server-cookie-token',
            user: {
              userId: 7,
              username: 'sarah',
              userType: 'human',
              roles: [],
              permissions: [],
              mustChangePassword: false,
            },
          },
        });
      }),
      http.get('http://localhost:3000/api/v1/auth/me', () =>
        HttpResponse.json({
          code: 'OK',
          translationKey: null,
          translationParams: {},
          data: {
            userId: 7,
            username: 'sarah',
            userType: 'human',
            roles: [],
            permissions: ['queue_view'],
            mustChangePassword: false,
            scope: { isGlobal: false, siteIds: [12], queueIds: [] },
          },
        }),
      ),
    );
    await login({ username: 'sarah', password: 'secret' }, true);
    expect(submittedUsername).toBe('sarah');
    expect(getAccessToken()).toBe('access-token');
    expect(getRememberedUsername()).toBe('sarah');
    expect(JSON.stringify(localStorage)).not.toContain('server-cookie-token');
  });

  it('calls logout and always purges session and query caches', async () => {
    let logoutCalled = false;
    mockServer.use(
      http.post('http://localhost:3000/api/v1/auth/logout', () => {
        logoutCalled = true;
        return HttpResponse.json({
          code: 'OK',
          translationKey: null,
          translationParams: {},
          data: {},
        });
      }),
    );
    const queryClient = new QueryClient();
    queryClient.setQueryData(['sites'], ['cached']);
    useSessionStore.getState().authenticate({
      userId: 1,
      username: 'u',
      userType: 'human',
      roles: [],
      permissions: [],
      mustChangePassword: false,
      scope: { isGlobal: true, siteIds: [], queueIds: [] },
    });
    await clearSession(queryClient);
    expect(logoutCalled).toBe(true);
    expect(useSessionStore.getState().status).toBe('anonymous');
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('purges session, scope, brand and cached data when authentication expires', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['private'], { secret: true });
    useSessionStore.getState().authenticate({
      userId: 1,
      username: 'operator',
      userType: 'human',
      roles: [],
      permissions: ['queue_view'],
      mustChangePassword: false,
      scope: { isGlobal: false, siteIds: [12], queueIds: [25] },
    });
    useScopeStore.getState().setActiveSite(12, {
      isGlobal: false,
      siteIds: [12],
      queueIds: [25],
    });
    useBrandStore.setState({ name: 'Private site', logoUrl: 'https://invalid.test/logo.svg' });

    await expireSession(queryClient);

    expect(useSessionStore.getState().status).toBe('anonymous');
    expect(useScopeStore.getState().activeSiteId).toBeNull();
    expect(useBrandStore.getState()).toMatchObject({ name: 'DORI', logoUrl: null });
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });
});
