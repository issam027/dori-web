import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api/client/query-keys';
import { findPerson, findPersons } from '../api/persons-api';
import type { PersonsControllerFindPersonsSort } from '@/api/generated/models';

export function usePersonsSearch(options: {
  siteId: string | null;
  search: string;
  page: number;
  pageSize?: number;
  usage?: string;
  enabled?: boolean;
}) {
  const search = options.search.trim();
  const pageSize = options.pageSize ?? 5;
  return useQuery({
    queryKey: queryKeys.persons.search(
      options.siteId,
      search,
      options.page,
      pageSize,
      options.usage,
    ),
    queryFn: ({ signal }) => {
      if (options.siteId === null) throw new Error('An active site is required');
      return findPersons({ siteId: options.siteId, search, page: options.page, pageSize }, signal);
    },
    enabled: options.enabled !== false && options.siteId !== null && search.length >= 3,
  });
}

export function useAdminPersons(options: {
  siteId: string | null;
  search: string;
  page: number;
  status: 'all' | 'active' | 'inactive';
  sort: PersonsControllerFindPersonsSort;
}) {
  return useQuery({
    queryKey: queryKeys.persons.adminSearch(options.siteId, options.search, options.page, 10, {
      status: options.status,
      sort: options.sort,
    }),
    queryFn: ({ signal }) => {
      if (!options.siteId) throw new Error('An active site is required');
      return findPersons(
        {
          siteId: options.siteId,
          page: options.page,
          pageSize: 10,
          sort: options.sort,
          isActive: options.status === 'all' ? undefined : options.status === 'active',
          search: options.search || undefined,
        },
        signal,
      );
    },
    enabled: Boolean(options.siteId),
  });
}

export function usePerson(personId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.persons.detail(personId),
    queryFn: ({ signal }) => findPerson(personId ?? '', signal),
    enabled: enabled && Boolean(personId),
  });
}
