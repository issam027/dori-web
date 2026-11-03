import { afterEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/shared/testing/mock-server';
import { usePreferencesStore } from '@/core/theme/preferences-store';
import { useScopeStore } from '@/core/scope/scope-store';
import { useSessionStore } from './session-store';
import { hydrateSession, login } from './session-actions';

const profile = {
  userId: 'user',
  username: 'user',
  userType: 'human',
  languagePreference: 'en',
  mustChangePassword: false,
  roles: ['operator'],
  permissions: [],
  scope: { isGlobal: false, siteIds: [], queueIds: [] },
};
describe('authenticated locale defaults', () => {
  afterEach(() => {
    usePreferencesStore.getState().setLocale('fr');
    useSessionStore.getState().clear();
    useScopeStore.getState().clear();
  });
  it('applies the profile locale during session restoration', async () => {
    mockServer.use(
      http.get('http://localhost:3000/api/v1/auth/me', () => HttpResponse.json({ data: profile })),
    );
    await hydrateSession();
    expect(usePreferencesStore.getState().locale).toBe('en');
  });
  it('uses the language returned by login in preference to a stale profile response', async () => {
    mockServer.use(
      http.post('http://localhost:3000/api/v1/auth/login', () =>
        HttpResponse.json({
          data: { accessToken: 'test-token', user: { ...profile, languagePreference: 'ar-tn' } },
        }),
      ),
      http.get('http://localhost:3000/api/v1/auth/me', () => HttpResponse.json({ data: profile })),
    );
    await login({ username: 'user', password: 'test-password' }, false);
    expect(usePreferencesStore.getState().locale).toBe('ar-TN');
  });
  it('keeps the existing choice when an older profile response omits its language', async () => {
    usePreferencesStore.getState().setLocale('ar-TN');
    mockServer.use(
      http.get('http://localhost:3000/api/v1/auth/me', () =>
        HttpResponse.json({ data: { ...profile, languagePreference: undefined } }),
      ),
    );
    await hydrateSession();
    expect(usePreferencesStore.getState().locale).toBe('ar-TN');
  });
});
