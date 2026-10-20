import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { invalidatePersonNotes } from '@/api/client/query-invalidations';
import { queryKeys } from '@/api/client/query-keys';
import { useBusinessMutation } from '@/api/client/use-business-mutation';
import {
  createPersonNote,
  deletePersonNote,
  findPersonNotes,
  updatePersonNote,
} from '../api/notes-api';

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

export function useUpdatePersonNote(personId: number) {
  const queryClient = useQueryClient();
  return useBusinessMutation({
    mutationFn: ({ noteId, content }: { noteId: number; content: string }) =>
      updatePersonNote(personId, noteId, { content }),
    expectedErrorStatuses: [400, 404, 422],
    invalidate: () => invalidatePersonNotes(queryClient, personId),
  });
}

export function useDeletePersonNote(personId: number) {
  const queryClient = useQueryClient();
  return useBusinessMutation({
    mutationFn: (noteId: number) => deletePersonNote(personId, noteId),
    expectedErrorStatuses: [404, 409, 422],
    invalidate: () => invalidatePersonNotes(queryClient, personId),
  });
}
