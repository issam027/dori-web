import type { QueryClient } from '@tanstack/react-query';
import type { LoginDto, UserScopeDto } from '@/api/generated/models';
import {
  authControllerLogin,
  authControllerLogout,
  authControllerMe,
} from '@/api/generated/authentification/authentification';
import { sitesControllerFindSite } from '@/api/generated/sites/sites';
import { useScopeStore } from '@/core/scope/scope-store';
import { useBrandStore } from '@/core/theme/brand-store';
import { useSessionStore } from './session-store';
import { setAccessToken } from './access-token';

const rememberedUsernameKey = 'dori.rememberedUsername';

export function getRememberedUsername(): string {
  return localStorage.getItem(rememberedUsernameKey) ?? '';
}

export async function login(credentials: LoginDto, rememberUsername: boolean): Promise<void> {
  const response = await authControllerLogin(credentials);
  setAccessToken(response.data.accessToken);
  if (rememberUsername) localStorage.setItem(rememberedUsernameKey, credentials.username);
  else localStorage.removeItem(rememberedUsernameKey);
  await hydrateSession();
}

export async function hydrateSession(): Promise<void> {
  useSessionStore.getState().beginHydration();
  try {
    const response = await authControllerMe();
    useSessionStore.getState().authenticate(response.data);
    const restoredSite = useScopeStore.getState().activeSiteId;
    const restoredSiteIsAllowed =
      restoredSite !== null &&
      (response.data.scope.isGlobal || response.data.scope.siteIds.includes(restoredSite));
    const onlySite =
      response.data.scope.siteIds.length === 1 ? response.data.scope.siteIds[0] : undefined;
    if (restoredSiteIsAllowed) {
      useScopeStore.getState().setActiveSite(restoredSite, response.data.scope);
    } else if (onlySite !== undefined) {
      useScopeStore.getState().setActiveSite(onlySite, response.data.scope);
    } else {
      useScopeStore.getState().clear();
    }
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

export async function expireSession(queryClient: QueryClient): Promise<void> {
  useSessionStore.getState().clear();
  useScopeStore.getState().clear();
  useBrandStore.getState().reset();
  await queryClient.cancelQueries();
  queryClient.clear();
}

export async function changeActiveSite(
  queryClient: QueryClient,
  siteId: number,
  scope: UserScopeDto,
): Promise<void> {
  await queryClient.cancelQueries();
  useScopeStore.getState().setActiveSite(siteId, scope);
  queryClient.removeQueries();
  useBrandStore.getState().reset();
  const response = await sitesControllerFindSite(siteId);
  useBrandStore.getState().applySite(response.data);
}
