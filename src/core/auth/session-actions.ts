import { usePreferencesStore } from '@/core/theme/preferences-store';
import { normalizeLocale } from '@/core/i18n/config';
import type { QueryClient } from '@tanstack/react-query';
import type { LoginDto, UserScopeDto } from '@/api/generated/models';
import {
  authControllerLogin,
  authControllerLogout,
  authControllerMe,
} from '@/api/generated/authentification/authentification';
import { sitesControllerFindSite } from '@/api/generated/sites/sites';
import { readStoredSiteId, useScopeStore } from '@/core/scope/scope-store';
import { useBrandStore } from '@/core/theme/brand-store';
import { useSessionStore } from './session-store';
import { getAccessToken, setAccessToken, publishSessionEnded } from './access-token';
import { useOperationStore } from '@/shared/queue-operations/operation-store';
import { queryKeys } from '@/api/client/query-keys';
import { clearOwnedStorage, storageKeys } from '@/core/storage/storage-keys';
import { refreshAccessToken } from '@/api/client/http-client';

let contextChangeVersion = 0;

export function getRememberedUsername(): string {
  return localStorage.getItem(storageKeys.local.rememberedUsername) ?? '';
}

export async function login(credentials: LoginDto, rememberUsername: boolean): Promise<void> {
  const response = await authControllerLogin(credentials);
  setAccessToken(response.data.accessToken);
  if (rememberUsername)
    localStorage.setItem(storageKeys.local.rememberedUsername, credentials.username);
  else localStorage.removeItem(storageKeys.local.rememberedUsername);
  await hydrateSession({ locale: response.data.user.languagePreference });
}

export async function hydrateSession(options: { locale?: string | null } = {}): Promise<void> {
  useSessionStore.getState().beginHydration();
  try {
    const response = await authControllerMe();
    const restoredSite = readStoredSiteId();
    const restoredSiteIsAllowed =
      restoredSite !== null &&
      (response.data.scope.isGlobal || response.data.scope.siteIds.includes(restoredSite));
    const technicalSite =
      response.data.userType === 'kiosk' && response.data.scope.siteIds.length === 1
        ? response.data.scope.siteIds[0]
        : undefined;
    if (restoredSiteIsAllowed) {
      useScopeStore.getState().setActiveSite(restoredSite, response.data.scope);
    } else if (technicalSite) {
      useScopeStore.getState().setActiveSite(technicalSite, response.data.scope);
    } else {
      useScopeStore.getState().clear();
    }
    const profileLocale = options.locale ?? response.data.languagePreference;
    if (profileLocale) usePreferencesStore.getState().setLocale(normalizeLocale(profileLocale));
    useSessionStore.getState().authenticate(response.data);
  } catch (error: unknown) {
    useSessionStore.getState().clear();
    useScopeStore.getState().clear();
    throw error;
  }
}

export async function restoreSession(): Promise<void> {
  useSessionStore.getState().beginHydration();
  try {
    if (!getAccessToken()) await refreshAccessToken();
    await hydrateSession();
  } catch (error: unknown) {
    useSessionStore.getState().clear();
    useScopeStore.getState().clear();
    throw error;
  }
}

export async function clearSession(queryClient: QueryClient): Promise<void> {
  try {
    await authControllerLogout({});
  } catch {
    // Local logout must still complete when the server session is already unavailable.
  }
  await expireSession(queryClient);
}

export async function expireSession(queryClient: QueryClient, broadcast = true): Promise<void> {
  contextChangeVersion++;
  if (broadcast) publishSessionEnded();
  useSessionStore.getState().clear();
  useScopeStore.getState().clear();
  useBrandStore.getState().reset();
  useOperationStore.getState().reset();
  await queryClient.cancelQueries();
  queryClient.clear();
  clearOwnedStorage();
}

export async function changeActiveSite(
  queryClient: QueryClient,
  siteId: string,
  scope: UserScopeDto,
): Promise<void> {
  const version = ++contextChangeVersion;
  const previousSiteId = useScopeStore.getState().activeSiteId;
  if (previousSiteId !== siteId) {
    await queryClient.cancelQueries();
    if (version !== contextChangeVersion) return;
    queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'sites' });
  }
  useScopeStore.getState().setActiveSite(siteId, scope);
  useBrandStore.getState().reset();
  if (previousSiteId !== null && previousSiteId !== siteId) {
    useOperationStore.getState().reset();
  }
  try {
    const response = await queryClient.query({
      queryKey: queryKeys.sites.detail(siteId),
      queryFn: ({ signal }) => sitesControllerFindSite(siteId, undefined, signal),
    });
    if (version === contextChangeVersion && useScopeStore.getState().activeSiteId === siteId) {
      useBrandStore.getState().applySite(response.data);
    }
  } catch (error) {
    if (version !== contextChangeVersion) return;
    throw error;
  }
}

export async function clearActiveSiteContext(queryClient: QueryClient): Promise<void> {
  const version = ++contextChangeVersion;
  await queryClient.cancelQueries();
  if (version !== contextChangeVersion) return;
  useScopeStore.getState().clear();
  useBrandStore.getState().reset();
  useOperationStore.getState().reset();
  queryClient.removeQueries({
    predicate: (query) => query.queryKey[0] !== 'sites',
  });
}
