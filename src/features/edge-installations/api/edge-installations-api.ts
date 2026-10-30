import {
  edgeAdminControllerCommand,
  edgeAdminControllerCreate,
  edgeAdminControllerDetail,
  edgeAdminControllerList,
  edgeAdminControllerUpdateStatus,
} from '@/api/generated/edge-administration/edge-administration';
import type {
  CreateEdgeCommandDtoType,
  EdgeAdminControllerCommand201,
  EdgeAdminControllerCreate201,
  EdgeAdminControllerDetail200,
  EdgeAdminControllerList200,
} from '@/api/generated/models';

export const fetchEdgeInstallations = (signal?: AbortSignal): Promise<EdgeAdminControllerList200> =>
  edgeAdminControllerList(undefined, signal);

export const fetchEdgeInstallation = (
  installationId: string,
  signal?: AbortSignal,
): Promise<EdgeAdminControllerDetail200> =>
  edgeAdminControllerDetail(installationId, undefined, signal);

export const createEdgeInstallation = (name: string): Promise<EdgeAdminControllerCreate201> =>
  edgeAdminControllerCreate({ name });

export const createEdgeCommand = (
  installationId: string,
  type: CreateEdgeCommandDtoType,
): Promise<EdgeAdminControllerCommand201> =>
  edgeAdminControllerCommand(installationId, { type, payload: {} });

export const updateEdgeInstallationStatus = (
  installationId: string,
  deploymentStatus: 'active' | 'revoked',
) => edgeAdminControllerUpdateStatus(installationId, { deploymentStatus });
