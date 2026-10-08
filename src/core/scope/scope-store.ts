import { create } from 'zustand';
import type { UserScopeDto } from '@/api/generated/models';

interface ScopeState {
  activeSiteId: number | null;
  activeQueueId: number | null;
  setActiveSite: (siteId: number, scope: UserScopeDto) => void;
  setActiveQueue: (queueId: number, scope: UserScopeDto) => void;
  clear: () => void;
}

const activeSiteStorageKey = 'dori.activeSiteId';
const storedSiteId = Number(sessionStorage.getItem(activeSiteStorageKey));

function assertScoped(
  resourceId: number,
  allowedIds: number[],
  isGlobal: boolean,
  label: string,
): void {
  if (!isGlobal && !allowedIds.includes(resourceId)) {
    throw new Error(`${label} is outside the authenticated scope`);
  }
}

export const useScopeStore = create<ScopeState>((set) => ({
  activeSiteId: Number.isInteger(storedSiteId) && storedSiteId > 0 ? storedSiteId : null,
  activeQueueId: null,
  setActiveSite: (siteId, scope) => {
    assertScoped(siteId, scope.siteIds, scope.isGlobal, 'Site');
    sessionStorage.setItem(activeSiteStorageKey, String(siteId));
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
