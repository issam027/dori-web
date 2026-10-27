import { http, HttpResponse } from 'msw';
import { QueryClient } from '@tanstack/react-query';
import { mockServer } from '@/shared/testing/mock-server';
import { useScopeStore } from '@/core/scope/scope-store';
import { getAccessToken, setAccessToken } from './access-token';
import { storageKeys } from '@/core/storage/storage-keys';
import {
  clearSession,
  clearActiveSiteContext,
  changeActiveSite,
  expireSession,
  getRememberedUsername,
  hydrateSession,
  login,
  restoreSession,
} from './session-actions';
import { useBrandStore } from '@/core/theme/brand-store';
import { useSessionStore } from './session-store';
import { useOperationStore } from '@/shared/queue-operations/operation-store';

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
            userId: '00000000-0000-4000-8000-000000000007',
            username: 'sarah',
            userType: 'human',
            roles: ['operator'],
            permissions: ['queue_view'],
            mustChangePassword: false,
            scope: {
              isGlobal: false,
              siteIds: ['00000000-0000-4000-8000-000000000012'],
              queueIds: ['00000000-0000-4000-8000-000000000025'],
            },
          },
        }),
      ),
    );

    await hydrateSession();

    expect(useSessionStore.getState()).toMatchObject({
      status: 'authenticated',
      user: { userId: '00000000-0000-4000-8000-000000000007', permissions: ['queue_view'] },
    });
    expect(useScopeStore.getState().activeSiteId).toBe('00000000-0000-4000-8000-000000000012');
  });

  it('restores an access token before loading /auth/me after a page reload', async () => {
    const calls: string[] = [];
    mockServer.use(
      http.post('http://localhost:3000/api/v1/auth/refresh', () => {
        calls.push('refresh');
        return HttpResponse.json({
          code: 'OK',
          translationKey: null,
          translationParams: {},
          data: { accessToken: 'restored-token' },
        });
      }),
      http.get('http://localhost:3000/api/v1/auth/me', ({ request }) => {
        calls.push('me');
        expect(request.headers.get('authorization')).toBe('Bearer restored-token');
        return HttpResponse.json({
          code: 'OK',
          translationKey: null,
          translationParams: {},
          data: {
            userId: '00000000-0000-4000-8000-000000000007',
            username: 'sarah',
            userType: 'human',
            roles: ['operator'],
            permissions: ['queue_view'],
            mustChangePassword: false,
            scope: { isGlobal: true, siteIds: [], queueIds: [] },
          },
        });
      }),
    );

    await restoreSession();

    expect(calls).toEqual(['refresh', 'me']);
    expect(getAccessToken()).toBe('restored-token');
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
              userId: '00000000-0000-4000-8000-000000000007',
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
            userId: '00000000-0000-4000-8000-000000000007',
            username: 'sarah',
            userType: 'human',
            roles: [],
            permissions: ['queue_view'],
            mustChangePassword: false,
            scope: {
              isGlobal: false,
              siteIds: ['00000000-0000-4000-8000-000000000012'],
              queueIds: [],
            },
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
      userId: '00000000-0000-4000-8000-000000000001',
      username: 'u',
      userType: 'human',
      roles: [],
      permissions: [],
      mustChangePassword: false,
      scope: { isGlobal: true, siteIds: [], queueIds: [] },
    });
    setAccessToken('logout-token');
    localStorage.setItem(storageKeys.local.rememberedUsername, 'u');
    localStorage.setItem('foreign.preference', 'keep-local');
    sessionStorage.setItem(storageKeys.session.sidebarCollapsed, 'true');
    sessionStorage.setItem('foreign.session', 'keep-session');
    await clearSession(queryClient);
    expect(logoutCalled).toBe(true);
    expect(useSessionStore.getState().status).toBe('anonymous');
    expect(getAccessToken()).toBeNull();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(localStorage.getItem(storageKeys.local.rememberedUsername)).toBeNull();
    expect(sessionStorage.getItem(storageKeys.session.sidebarCollapsed)).toBeNull();
    expect(localStorage.getItem('foreign.preference')).toBe('keep-local');
    expect(sessionStorage.getItem('foreign.session')).toBe('keep-session');
  });

  it('purges session, scope, brand and cached data when authentication expires', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['private'], { secret: true });
    useSessionStore.getState().authenticate({
      userId: '00000000-0000-4000-8000-000000000001',
      username: 'operator',
      userType: 'human',
      roles: [],
      permissions: ['queue_view'],
      mustChangePassword: false,
      scope: {
        isGlobal: false,
        siteIds: ['00000000-0000-4000-8000-000000000012'],
        queueIds: ['00000000-0000-4000-8000-000000000025'],
      },
    });
    useScopeStore.getState().setActiveSite('00000000-0000-4000-8000-000000000012', {
      isGlobal: false,
      siteIds: ['00000000-0000-4000-8000-000000000012'],
      queueIds: ['00000000-0000-4000-8000-000000000025'],
    });
    useBrandStore.setState({ name: 'Private site', logoUrl: 'https://invalid.test/logo.svg' });
    setAccessToken('expired-token');
    localStorage.setItem(storageKeys.local.onboardingDraft, '{}');
    localStorage.setItem(storageKeys.local.legacyOnboardingDrafts[0], '{}');
    localStorage.setItem(storageKeys.local.legacyOnboardingDrafts[1], '{}');
    localStorage.setItem('foreign.preference', 'keep-local');
    sessionStorage.setItem(storageKeys.session.sidebarCollapsed, 'true');
    sessionStorage.setItem('foreign.session', 'keep-session');

    await expireSession(queryClient);

    expect(useSessionStore.getState().status).toBe('anonymous');
    expect(getAccessToken()).toBeNull();
    expect(useScopeStore.getState().activeSiteId).toBeNull();
    expect(useBrandStore.getState()).toMatchObject({ name: 'DORIFY', logoUrl: null });
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(localStorage.getItem(storageKeys.local.onboardingDraft)).toBeNull();
    expect(localStorage.getItem(storageKeys.local.legacyOnboardingDrafts[0])).toBeNull();
    expect(localStorage.getItem(storageKeys.local.legacyOnboardingDrafts[1])).toBeNull();
    expect(sessionStorage.getItem(storageKeys.session.activeSiteId)).toBeNull();
    expect(sessionStorage.getItem(storageKeys.session.sidebarCollapsed)).toBeNull();
    expect(localStorage.getItem('foreign.preference')).toBe('keep-local');
    expect(sessionStorage.getItem('foreign.session')).toBe('keep-session');
  });
});

describe('changeActiveSite cockpit preservation', () => {
  const scope = {
    isGlobal: false,
    siteIds: ['00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000013'],
    queueIds: ['00000000-0000-4000-8000-000000000025'],
  };
  const activeCall = {
    registrationId: '00000000-0000-4000-8000-000000000009',
    ticketNumber: 'A009',
    entryType: 'walkin' as const,
    calledEarly: false,
    tier: { tierId: 'tier-1', tierCode: 'STANDARD', tierName: 'Standard' },
    status: 'called',
    sessionId: '00000000-0000-4000-8000-000000000002',
    threadNumber: 1,
    priorityScore: 1,
    calledAt: '2026-10-08T08:00:00Z',
    person: { personId: 'person-1', hasNotes: false },
  };

  beforeEach(() => {
    mockServer.use(
      http.get('http://localhost:3000/api/v1/sites/:siteId', ({ params }) =>
        HttpResponse.json({
          code: 'OK',
          translationKey: null,
          translationParams: {},
          data: { siteId: params.siteId, siteName: 'Site test' },
        }),
      ),
    );
    useScopeStore.getState().setActiveSite('00000000-0000-4000-8000-000000000012', scope);
    useOperationStore.getState().startCall('00000000-0000-4000-8000-000000000004', activeCall);
  });

  afterEach(() => {
    useScopeStore.getState().clear();
    useOperationStore.getState().reset();
  });

  it('keeps the active call when the same site context is reapplied', async () => {
    await changeActiveSite(new QueryClient(), '00000000-0000-4000-8000-000000000012', scope);
    expect(
      useOperationStore.getState().activeCalls['00000000-0000-4000-8000-000000000004']
        ?.registrationId,
    ).toBe('00000000-0000-4000-8000-000000000009');
  });

  it('purges the active call but preserves cached page data when the operator changes site', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['queues', 'site', 12], {
      siteId: '00000000-0000-4000-8000-000000000012',
    });

    await changeActiveSite(queryClient, '00000000-0000-4000-8000-000000000013', scope);

    expect(useOperationStore.getState().activeCalls).toEqual({});
    expect(queryClient.getQueryData(['queues', 'site', 12])).toEqual({
      siteId: '00000000-0000-4000-8000-000000000012',
    });
    expect(
      queryClient.getQueryData(['sites', 'detail', '00000000-0000-4000-8000-000000000013']),
    ).toBeDefined();
  });

  it('clears the site context and site-bound state without dropping the sites cache', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['sites', 'portfolio'], { items: [] });
    queryClient.setQueryData(['queues', 'site', 12], { items: [] });
    useBrandStore.setState({ name: 'Site test', logoUrl: null });

    await clearActiveSiteContext(queryClient);

    expect(useScopeStore.getState().activeSiteId).toBeNull();
    expect(useOperationStore.getState().activeCalls).toEqual({});
    expect(useBrandStore.getState().name).toBe('DORIFY');
    expect(queryClient.getQueryData(['sites', 'portfolio'])).toEqual({ items: [] });
    expect(queryClient.getQueryData(['queues', 'site', 12])).toBeUndefined();
  });
});
