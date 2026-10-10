import type { QueuesControllerFindAllParams } from '@/api/generated/models';
import { queuesControllerFindAll, queuesControllerGetStatus } from '@/api/generated/queues/queues';

export const findQueues = (params: QueuesControllerFindAllParams, signal?: AbortSignal) =>
  queuesControllerFindAll(params, undefined, signal);

export const findQueueStatus = (queueId: number, signal?: AbortSignal) =>
  queuesControllerGetStatus(queueId, undefined, signal);
