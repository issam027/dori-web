import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api/client/query-keys';
import { fetchHealth } from '../api/health-api';
import { edgeLocalControllerStatus } from '@/api/generated/edge-local-status/edge-local-status';
import { isCloudDeployment } from '@/core/config/deployment-mode';

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health.all,
    queryFn: ({ signal }) => fetchHealth(signal),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}

export function useAgentStatus() {
  return useQuery({
    queryKey: ['health', 'edge-agent'],
    queryFn: ({ signal }) => edgeLocalControllerStatus(undefined, signal),
    enabled: !isCloudDeployment,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    retry: 1,
  });
}
