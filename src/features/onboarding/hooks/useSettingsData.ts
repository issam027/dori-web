import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/client/query-keys';
import { invalidateAdmin } from '@/api/client/query-invalidations';
import { findQueues, findRoles, findSites, findTiers } from '../api/onboarding-api';
import { sitesControllerGetManagers } from '@/api/generated/sites/sites';

export function useSettingsData(siteId: number | null, queueStatus: 'active' | 'inactive' | 'all' = 'active') {
  const queryClient = useQueryClient();
  const sites = useQuery({
    queryKey: queryKeys.admin.sites,
    queryFn: async ({ signal }) => {
      const [active, inactive] = await Promise.all([
        findSites({ page: 1, pageSize: 100, isActive: true }, undefined, signal),
        findSites({ page: 1, pageSize: 100, isActive: false }, undefined, signal),
      ]);
      return {
        ...active,
        data: {
          ...active.data,
          items: [...active.data.items, ...inactive.data.items],
          total: active.data.total + inactive.data.total,
        },
      };
    },
  });
  const queues = useQuery({
    queryKey: [...queryKeys.admin.queues(siteId), queueStatus],
    queryFn: async ({ signal }) => {
      const load = (isActive: boolean) => findQueues({ page: 1, pageSize: 100, siteId: siteId ?? undefined, isActive }, undefined, signal);
      if (queueStatus !== 'all') return load(queueStatus === 'active');
      const [active, inactive] = await Promise.all([load(true), load(false)]);
      return { ...active, data: { ...active.data, items: [...active.data.items, ...inactive.data.items], total: active.data.total + inactive.data.total } };
    },
    enabled: siteId !== null,
  });
  const roles = useQuery({
    queryKey: queryKeys.admin.roles,
    queryFn: ({ signal }) => findRoles({ page: 1, pageSize: 100 }, undefined, signal),
  });
  const tiers = useQuery({
    queryKey: queryKeys.admin.tiers,
    queryFn: ({ signal }) => findTiers({ page: 1, pageSize: 100 }, undefined, signal),
  });
  const managers = useQuery({
    queryKey: ['admin', 'site-managers', siteId],
    queryFn: ({ signal }) =>
      sitesControllerGetManagers(
        siteId ?? 0,
        { page: 1, pageSize: 100, sort: 'username:asc' },
        undefined,
        signal,
      ),
    enabled: siteId !== null,
  });

  return {
    sites: sites.data?.data.items ?? [],
    queues: queues.data?.data.items ?? [],
    roles: roles.data?.data.items ?? [],
    tiers: tiers.data?.data.items ?? [],
    managers: managers.data?.data.items ?? [],
    refreshManagers: () => managers.refetch(),
    refresh: () => invalidateAdmin(queryClient),
  };
}
