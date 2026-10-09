import { MutationCache, QueryClient } from '@tanstack/react-query';
import { NormalizedApiError } from '@/core/errors/normalized-api-error';
import { presentError } from '@/core/notifications/error-presentation';
import { notify } from '@/core/notifications/notification-store';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        if (mutation.meta?.suppressGlobalError === true) return;
        notify({ tone: 'error', ...presentError(error) });
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (error instanceof NormalizedApiError && [401, 403, 404].includes(error.status ?? 0)) {
            return false;
          }
          return failureCount < 1;
        },
      },
      mutations: { retry: false },
    },
  });
}
