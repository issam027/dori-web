import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateEdgeCommandDtoType } from '@/api/generated/models';
import {
  createEdgeCommand,
  createEdgeInstallation,
  fetchEdgeInstallation,
  fetchEdgeInstallations,
} from '../api/edge-installations-api';

export const edgeInstallationKeys = {
  all: ['edge-installations'] as const,
  detail: (installationId: string | null) => ['edge-installations', installationId] as const,
};

export function useEdgeInstallations() {
  return useQuery({
    queryKey: edgeInstallationKeys.all,
    queryFn: ({ signal }) => fetchEdgeInstallations(signal),
    refetchInterval: 30_000,
  });
}

export function useEdgeInstallation(installationId: string | null) {
  return useQuery({
    queryKey: edgeInstallationKeys.detail(installationId),
    queryFn: ({ signal }) => fetchEdgeInstallation(installationId as string, signal),
    enabled: Boolean(installationId),
    refetchInterval: 15_000,
  });
}

export function useCreateEdgeInstallation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createEdgeInstallation,
    onSuccess: () => client.invalidateQueries({ queryKey: edgeInstallationKeys.all }),
  });
}

export function useCreateEdgeCommand(installationId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (type: CreateEdgeCommandDtoType) =>
      createEdgeCommand(installationId as string, type),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: edgeInstallationKeys.detail(installationId) }),
  });
}
