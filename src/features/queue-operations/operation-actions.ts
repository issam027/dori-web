import { queueEngineControllerCallNext } from '@/api/generated/queue-engine/queue-engine';
import { useOperationStore } from './operation-store';

export type CallNextOutcome = 'called' | 'empty';

export async function callNextAndCommit(queueId: number): Promise<CallNextOutcome> {
  const response = await queueEngineControllerCallNext(queueId);
  const registration = response.data as typeof response.data | null;
  // QUEUE_EMPTY is an expected business outcome returned by the API with HTTP 200.
  // Do not attempt to commit its null payload as an active call.
  if (response.code === 'QUEUE_EMPTY' || registration === null) return 'empty';

  useOperationStore.getState().startCall(registration);
  return 'called';
}
