import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/client/query-keys';
import { invalidateAdmin } from '@/api/client/query-invalidations';
import { findQueues, findRoles, findSites, findTiers, findTranslations, findUsers } from '../api/onboarding-api';

export function useSettingsData(siteId: number | null, locale: string) {
  const queryClient = useQueryClient();
  const sites = useQuery({
    queryKey: queryKeys.admin.sites,
    queryFn: ({ signal }) => findSites({ page: 1, pageSize: 100 }, undefined, signal),
  });
  const queues = useQuery({
    queryKey: queryKeys.admin.queues(siteId),
    queryFn: ({ signal }) =>
      findQueues(
        { page: 1, pageSize: 100, siteId: siteId ?? undefined },
        undefined,
        signal,
      ),
    enabled: siteId !== null,
  });
  const users = useQuery({
    queryKey: queryKeys.admin.users,
    queryFn: ({ signal }) => findUsers({ page: 1, pageSize: 100 }, undefined, signal),
  });
  const roles = useQuery({
    queryKey: queryKeys.admin.roles,
    queryFn: ({ signal }) => findRoles({ page: 1, pageSize: 100 }, undefined, signal),
  });
  const tiers = useQuery({
    queryKey: queryKeys.admin.tiers,
    queryFn: ({ signal }) => findTiers({ page: 1, pageSize: 100 }, undefined, signal),
  });
  const translations = useQuery({
    queryKey: queryKeys.admin.translations(locale),
    queryFn: ({ signal }) => findTranslations({ page: 1, pageSize: 100 }, undefined, signal),
  });

  return {
    sites: sites.data?.data.items ?? [],
    queues: queues.data?.data.items ?? [],
    users: users.data?.data.items ?? [],
    roles: roles.data?.data.items ?? [],
    tiers: tiers.data?.data.items ?? [],
    translations: translations.data?.data.items ?? [],
    refresh: () => invalidateAdmin(queryClient),
  };
}
