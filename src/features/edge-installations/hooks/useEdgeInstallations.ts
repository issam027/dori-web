import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateEdgeCommandDtoType } from '@/api/generated/models';
import {
  createEdgeCommand,
  createEdgeInstallation,
  fetchEdgeInstallation,
  fetchEdgeInstallations,
  updateEdgeInstallationStatus,
} from '../api/edge-installations-api';
import { subscribeEdgeInstallations } from '../edge-installations-realtime';

export const edgeInstallationKeys = {
  all: ['edge-installations'] as const,
  detail: (installationId: string | null) => ['edge-installations', installationId] as const,
};

export function useEdgeInstallations() {
  return useQuery({
    queryKey: edgeInstallationKeys.all,
    queryFn: ({ signal }) => fetchEdgeInstallations(signal),
  });
}

export function useEdgeInstallation(installationId: string | null) {
  return useQuery({
    queryKey: edgeInstallationKeys.detail(installationId),
    queryFn: ({ signal }) => fetchEdgeInstallation(installationId as string, signal),
    enabled: Boolean(installationId),
  });
}

export function useEdgeInstallationsRealtime(installationId: string | null) {
  const client = useQueryClient();
  useEffect(() => {
    const controller = new AbortController();
    const invalidate = () => {
      void client.invalidateQueries({ queryKey: edgeInstallationKeys.all });
      if (installationId) {
        void client.invalidateQueries({ queryKey: edgeInstallationKeys.detail(installationId) });
      }
    };
    void subscribeEdgeInstallations(invalidate, controller.signal).catch(() => undefined);
    return () => {
      controller.abort();
    };
  }, [client, installationId]);
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

export function useUpdateEdgeInstallationStatus(installationId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (deploymentStatus: 'active' | 'revoked') =>
      updateEdgeInstallationStatus(installationId as string, deploymentStatus),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: edgeInstallationKeys.all }),
        client.invalidateQueries({ queryKey: edgeInstallationKeys.detail(installationId) }),
      ]);
    },
  });
}
