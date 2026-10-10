import { useQueryClient } from '@tanstack/react-query';
import { useBusinessMutation } from '@/api/client/use-business-mutation';
import { invalidateControlRoom } from '@/api/client/query-invalidations';
import { resetQueue } from '../api/control-room-api';

export function useResetQueue(onSuccess?: () => void | Promise<void>) {
  const queryClient = useQueryClient();
  return useBusinessMutation({
    mutationFn: (queueId: number) => resetQueue(queueId),
    expectedErrorStatuses: [404, 409, 422],
    invalidate: () => invalidateControlRoom(queryClient),
    invalidateOnConflict: () => invalidateControlRoom(queryClient),
    onSuccess: () => onSuccess?.(),
  });
}
