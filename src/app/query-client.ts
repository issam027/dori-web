import { QueryClient } from '@tanstack/react-query';
import { NormalizedApiError } from '@/core/errors/normalized-api-error';

export function createQueryClient(): QueryClient {
  return new QueryClient({
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
