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

const activeSiteStorageKey = storageKeys.session.activeSiteId;
const storedSiteId = sessionStorage.getItem(activeSiteStorageKey);

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
    sessionStorage.setItem(activeSiteStorageKey, siteId);
    set({ activeSiteId: siteId, activeQueueId: null });
  },
  setActiveQueue: (queueId, scope) => {
    assertScoped(queueId, scope.queueIds, scope.isGlobal, 'Queue');
    set({ activeQueueId: queueId });
  },
  clear: () => {
    sessionStorage.removeItem(activeSiteStorageKey);
    set({ activeSiteId: null, activeQueueId: null });
  },
}));
