import { create } from 'zustand';
import type { UserScopeDto } from '@/api/generated/models';
import { storageKeys } from '@/core/storage/storage-keys';

interface ScopeState {
  activeSiteId: string | null;
  activeQueueId: string | null;
  setActiveSite: (siteId: string, scope: UserScopeDto) => void;
  setActiveQueue: (queueId: string, scope: UserScopeDto) => void;
  clear: () => void;
}

const activeSiteStorageKey = storageKeys.local.activeSiteId;

export function readSharedSiteId(): string | null {
  return localStorage.getItem(activeSiteStorageKey);
}

export function readStoredSiteId(): string | null {
  // Existing tabs migrate their selection after scope validation during hydration.
  return readSharedSiteId() ?? sessionStorage.getItem(storageKeys.session.activeSiteId);
}
const storedSiteId = readStoredSiteId();

function assertScoped(
  resourceId: string,
  allowedIds: string[],
  isGlobal: boolean,
  label: string,
): void {
  if (!isGlobal && !allowedIds.includes(resourceId)) {
    throw new Error(`${label} is outside the authenticated scope`);
  }
}

export const useScopeStore = create<ScopeState>((set) => ({
  activeSiteId: storedSiteId || null,
  activeQueueId: null,
  setActiveSite: (siteId, scope) => {
    assertScoped(siteId, scope.siteIds, scope.isGlobal, 'Site');
    localStorage.setItem(activeSiteStorageKey, siteId);
    sessionStorage.removeItem(storageKeys.session.activeSiteId);
    set({ activeSiteId: siteId, activeQueueId: null });
  },
  setActiveQueue: (queueId, scope) => {
    assertScoped(queueId, scope.queueIds, scope.isGlobal, 'Queue');
    set({ activeQueueId: queueId });
  },
  clear: () => {
    localStorage.removeItem(activeSiteStorageKey);
    sessionStorage.removeItem(storageKeys.session.activeSiteId);
    set({ activeSiteId: null, activeQueueId: null });
  },
}));
