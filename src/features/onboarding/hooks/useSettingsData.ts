import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/client/query-keys';
import { invalidateAdmin } from '@/api/client/query-invalidations';
import { findQueues, findRoles, findSites, findTiers } from '../api/onboarding-api';

export function useSettingsData(siteId: number | null) {
  const queryClient = useQueryClient();
  const sites = useQuery({
    queryKey: queryKeys.admin.sites,
    queryFn: ({ signal }) => findSites({ page: 1, pageSize: 100 }, undefined, signal),
  });
  const queues = useQuery({
    queryKey: queryKeys.admin.queues(siteId),
    queryFn: ({ signal }) =>
      findQueues({ page: 1, pageSize: 100, siteId: siteId ?? undefined }, undefined, signal),
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

  return {
    sites: sites.data?.data.items ?? [],
    queues: queues.data?.data.items ?? [],
    roles: roles.data?.data.items ?? [],
    tiers: tiers.data?.data.items ?? [],
    refresh: () => invalidateAdmin(queryClient),
  };
}
