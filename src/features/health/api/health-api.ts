import { healthControllerCheck } from '@/api/generated/health/health';

export function fetchHealth(signal?: AbortSignal) {
  return healthControllerCheck(undefined, signal);
}
