export const storageKeys = {
  local: {
    rememberedUsername: 'dori.rememberedUsername',
    onboardingDraft: 'dori:onboarding:v3',
    legacyOnboardingDrafts: ['dori:onboarding:v2', 'dori:onboarding:v1'],
  },
  session: {
    activeSiteId: 'dori.activeSiteId',
    sidebarCollapsed: 'dori.sidebar.collapsed',
  },
} as const;

const ownedLocalStorageKeys = [
  storageKeys.local.rememberedUsername,
  storageKeys.local.onboardingDraft,
  ...storageKeys.local.legacyOnboardingDrafts,
] as const;

const ownedSessionStorageKeys = [
  storageKeys.session.activeSiteId,
  storageKeys.session.sidebarCollapsed,
] as const;

export function clearOwnedStorage(
  local: Pick<Storage, 'removeItem'> = localStorage,
  session: Pick<Storage, 'removeItem'> = sessionStorage,
): void {
  ownedLocalStorageKeys.forEach((key) => {
    local.removeItem(key);
  });
  ownedSessionStorageKeys.forEach((key) => {
    session.removeItem(key);
  });
}
