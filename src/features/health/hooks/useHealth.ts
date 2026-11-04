import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api/client/query-keys';
import { fetchHealth } from '../api/health-api';
import { useEdgeLocalStatus } from '@/shared/edge/use-edge-local-status';

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health.all,
    queryFn: ({ signal }) => fetchHealth(signal),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}

export const useAgentStatus = useEdgeLocalStatus;
