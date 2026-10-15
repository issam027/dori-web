import { monitoringControllerHealth } from '@/api/generated/monitoring/monitoring';

export function fetchHealth(signal?: AbortSignal) {
  return monitoringControllerHealth(undefined, signal);
}
