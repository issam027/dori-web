import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  personId: string,
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

export function useAddPersonNote(personId: string) {
  const queryClient = useQueryClient();
  return useBusinessMutation({
    mutationFn: (content: string) => createPersonNote(personId, { content }),
    expectedErrorStatuses: [400, 404, 422],
    invalidate: () => invalidatePersonNotes(queryClient, personId),
  });
}

export function useUpdatePersonNote(personId: string) {
  const queryClient = useQueryClient();
  return useBusinessMutation({
    mutationFn: ({ noteId, content }: { noteId: string; content: string }) =>
      updatePersonNote(personId, noteId, { content }),
    expectedErrorStatuses: [400, 404, 422],
    invalidate: () => invalidatePersonNotes(queryClient, personId),
  });
}

export function useDeletePersonNote(personId: string) {
  const queryClient = useQueryClient();
  return useBusinessMutation({
    mutationFn: (noteId: string) => deletePersonNote(personId, noteId),
    expectedErrorStatuses: [404, 409, 422],
    invalidate: () => invalidatePersonNotes(queryClient, personId),
  });
}
