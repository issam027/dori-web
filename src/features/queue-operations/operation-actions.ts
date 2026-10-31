import { queueEngineControllerCallNext } from '@/api/generated/queue-engine/queue-engine';
import { ErrorCode, type CallNextRegistrationResponseDto } from '@/api/generated/models';
import { useOperationStore } from '@/shared/queue-operations/operation-store';
import { NormalizedApiError } from '@/core/errors/normalized-api-error';

export type CallNextOutcome = 'called' | 'empty';

function isCalledRegistration(value: unknown): value is CallNextRegistrationResponseDto {
  if (!value || typeof value !== 'object') return false;
  const registration = value as Record<string, unknown>;
  return (
    typeof registration.registrationId === 'string' &&
    registration.registrationId.length > 0 &&
    typeof registration.ticketNumber === 'string' &&
    registration.ticketNumber.length > 0
  );
}

function isEmptyCallNextPayload(value: unknown): boolean {
  return value === null || (typeof value === 'object' && Object.keys(value).length === 0);
}

export async function callNextAndCommit(queueId: string): Promise<CallNextOutcome> {
  let response;
  try {
    response = await queueEngineControllerCallNext(queueId);
  } catch (error) {
    if (
      error instanceof NormalizedApiError &&
      error.code === ErrorCode.NO_CALLABLE_REGISTRATION &&
      error.status === 404
    ) {
      return 'empty';
    }
    throw error;
  }
  const registration: unknown = response.data;
  if (isEmptyCallNextPayload(registration)) return 'empty';
  if (!isCalledRegistration(registration)) throw new Error('Invalid call-next response payload');

  useOperationStore.getState().startCall(queueId, registration);
  return 'called';
}
