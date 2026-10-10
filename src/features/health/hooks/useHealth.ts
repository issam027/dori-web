import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api/client/query-keys';
import { fetchHealth } from '../api/health-api';

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health.all,
    queryFn: ({ signal }) => fetchHealth(signal),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}
