import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/client/query-keys';
import { invalidatePersonNotes } from '@/api/client/query-invalidations';
import { createPersonNote, findPerson, findPersonNotes, findPersons } from '../api/persons-api';
import { useBusinessMutation } from '@/api/client/use-business-mutation';

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
      return findPersons(
        { siteId: options.siteId, search, page: options.page, pageSize },
        signal,
      );
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

export function usePersonsByIds(personIds: readonly number[]) {
  return useQueries({
    queries: personIds.map((personId) => ({
      queryKey: queryKeys.persons.detail(personId),
      queryFn: ({ signal }: { signal: AbortSignal }) => findPerson(personId, signal),
    })),
  });
}

export function usePersonNotes(
  personId: number,
  options: { enabled?: boolean; pageSize?: number; usage?: string } = {},
) {
  return useQuery({
    queryKey: queryKeys.persons.notes(personId, options.usage),
    queryFn: ({ signal }) =>
      findPersonNotes(
        personId,
        { page: 1, pageSize: options.pageSize ?? 100, sort: 'createdAt:desc' },
        signal,
      ),
    enabled: options.enabled !== false,
  });
}

export function usePersonNotesPresence(personIds: readonly number[]) {
  return useQueries({
    queries: personIds.map((personId) => ({
      queryKey: queryKeys.persons.notes(personId, 'presence'),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        findPersonNotes(personId, { page: 1, pageSize: 1, sort: 'createdAt:desc' }, signal),
    })),
  });
}

export function useAddPersonNote(personId: number) {
  const queryClient = useQueryClient();
  return useBusinessMutation({
    mutationFn: (content: string) => createPersonNote(personId, { content }),
    expectedErrorStatuses: [400, 404, 422],
    invalidate: () => invalidatePersonNotes(queryClient, personId),
  });
}
