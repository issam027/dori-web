import { queueEngineControllerCallNext } from '@/api/generated/queue-engine/queue-engine';
import { useOperationStore } from './operation-store';

export async function callNextAndCommit(queueId: number): Promise<void> {
  const response = await queueEngineControllerCallNext(queueId);
  useOperationStore.getState().startCall(response.data);
}
