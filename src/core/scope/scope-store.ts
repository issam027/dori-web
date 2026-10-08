import { create } from 'zustand';
import type { UserScopeDto } from '@/api/generated/models';

interface ScopeState {
  activeSiteId: number | null;
  activeQueueId: number | null;
  setActiveSite: (siteId: number, scope: UserScopeDto) => void;
  setActiveQueue: (queueId: number, scope: UserScopeDto) => void;
  clear: () => void;
}

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
  activeSiteId: null,
  activeQueueId: null,
  setActiveSite: (siteId, scope) => {
    assertScoped(siteId, scope.siteIds, scope.isGlobal, 'Site');
    set({ activeSiteId: siteId, activeQueueId: null });
  },
  setActiveQueue: (queueId, scope) => {
    assertScoped(queueId, scope.queueIds, scope.isGlobal, 'Queue');
    set({ activeQueueId: queueId });
  },
  clear: () => {
    set({ activeSiteId: null, activeQueueId: null });
  },
}));
