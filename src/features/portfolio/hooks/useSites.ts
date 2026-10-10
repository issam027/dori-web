import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { queryKeys } from '@/api/client/query-keys';
import { changeActiveSite } from '@/core/auth/session-actions';
import { useScopeStore } from '@/core/scope/scope-store';
import type { UserScopeDto } from '@/api/generated/models';
import { findSite, findSites } from '../api/sites-api';

export function useSites(usage: 'portfolio' | 'context-switcher', enabled = true) {
  return useQuery({
    queryKey: usage === 'portfolio' ? queryKeys.sites.portfolio : queryKeys.sites.contextSwitcher,
    queryFn: ({ signal }) => findSites(signal),
    enabled,
  });
}

export function useSite(siteId: number | null) {
  return useQuery({
    queryKey: queryKeys.sites.detail(siteId),
    queryFn: ({ signal }) => findSite(siteId ?? 0, signal),
    enabled: siteId !== null,
  });
}

export function useActiveSite() {
  const queryClient = useQueryClient();
  const activeSiteId = useScopeStore((state) => state.activeSiteId);
  const activate = useCallback(
    (siteId: number, scope: UserScopeDto) => changeActiveSite(queryClient, siteId, scope),
    [queryClient],
  );
  return {
    activeSiteId,
    activate,
  };
}
