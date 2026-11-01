import { useCallback, useState } from 'react';
import type { QueueTierResponseDto } from '@/api/generated/models';

export function activeQueueServices(items: readonly QueueTierResponseDto[] = []) {
  return items.filter((item) => item.isActive && item.tier?.isActive !== false);
}

export function preferredQueueService(items: readonly QueueTierResponseDto[], selectedId?: string) {
  const active = activeQueueServices(items);
  return (
    active.find((item) => item.tierId === selectedId) ??
    active.find((item) => item.isDefault) ??
    (active.length === 1 ? active[0] : undefined)
  );
}

/** A choice belongs to its queue; defaults and sole services need no user interaction. */
export function useQueueServiceSelection(
  queueId: string | undefined,
  items: readonly QueueTierResponseDto[] = [],
  initialTierId?: string,
) {
  const [choice, setChoice] = useState({ queueId, tierId: initialTierId ?? '' });
  const activeTiers = activeQueueServices(items);
  const tier = preferredQueueService(
    activeTiers,
    choice.queueId === queueId ? choice.tierId : undefined,
  );
  const setTierId = useCallback((tierId: string) => setChoice({ queueId, tierId }), [queueId]);
  return { activeTiers, tier, tierId: tier?.tierId ?? '', setTierId };
}
