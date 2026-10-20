import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api/client/query-keys';
import { findPerson, findPersons } from '../api/persons-api';

export function usePersonsSearch(options: {
  siteId: number | null;
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

export function usePerson(personId: number | null | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.persons.detail(personId),
    queryFn: ({ signal }) => findPerson(personId ?? 0, signal),
    enabled: enabled && Boolean(personId),
  });
}
