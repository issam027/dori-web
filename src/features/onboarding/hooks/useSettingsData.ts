import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/client/query-keys';
import { invalidateAdmin } from '@/api/client/query-invalidations';
import { findQueues, findRoles, findSites, findTiers } from '../api/onboarding-api';
import { sitesControllerGetDirectUsers } from '@/api/generated/sites/sites';

export function useSettingsData(
  siteId: number | null,
  queueStatus: 'active' | 'inactive' | 'all' = 'active',
  enabled: Partial<Record<'sites' | 'queues' | 'roles' | 'tiers' | 'directUsers' | 'allAccessibleQueues', boolean>> = {},
) {
  const queryClient = useQueryClient();
  const sites = useQuery({
    queryKey: queryKeys.admin.sites,
    queryFn: async ({ signal }) => {
      return findSites({ page: 1, pageSize: 100 }, undefined, signal);
    },
    enabled: enabled.sites ?? true,
  });
  const queueSiteId = enabled.allAccessibleQueues ? null : siteId;
  const queues = useQuery({
    queryKey: queryKeys.admin.queuesByStatus(queueSiteId, queueStatus),
    queryFn: async ({ signal }) => {
      const load = (isActive: boolean) => findQueues({ page: 1, pageSize: 100, siteId: queueSiteId ?? undefined, isActive }, undefined, signal);
      if (queueStatus !== 'all') return load(queueStatus === 'active');
      return findQueues({ page: 1, pageSize: 100, siteId: queueSiteId ?? undefined }, undefined, signal);
    },
    enabled: (queueSiteId !== null || enabled.allAccessibleQueues === true) && (enabled.queues ?? true),
  });
  const roles = useQuery({
    queryKey: queryKeys.admin.roles,
    queryFn: ({ signal }) => findRoles({ page: 1, pageSize: 100 }, undefined, signal),
    enabled: enabled.roles ?? true,
  });
  const tiers = useQuery({
    queryKey: queryKeys.admin.tiers,
    queryFn: ({ signal }) => findTiers({ page: 1, pageSize: 100 }, undefined, signal),
    enabled: enabled.tiers ?? true,
  });
  const directUsers = useQuery({
    queryKey: queryKeys.admin.siteDirectUsers(siteId),
    queryFn: ({ signal }) =>
      sitesControllerGetDirectUsers(
        siteId ?? 0,
        { page: 1, pageSize: 100, sort: 'username:asc' },
        undefined,
        signal,
      ),
    enabled: siteId !== null && (enabled.directUsers ?? true),
  });

  return {
    sites: sites.data?.data.items ?? [],
    queues: queues.data?.data.items ?? [],
    roles: roles.data?.data.items ?? [],
    tiers: tiers.data?.data.items ?? [],
    directUsers: directUsers.data?.data.items ?? [],
    refreshDirectUsers: () => directUsers.refetch(),
    refresh: () => invalidateAdmin(queryClient),
  };
}
