import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { QueueTierResponseDto } from '@/api/generated/models';
import { preferredQueueService, useQueueServiceSelection } from './use-queue-service-selection';
const services: QueueTierResponseDto[] = [
  {
    queueId: 'a',
    tierId: 'free',
    price: 0,
    currency: 'TND',
    currencyOrigin: 'queue',
    isActive: true,
    isDefault: false,
    displayOrder: 1,
  },
  {
    queueId: 'a',
    tierId: 'premium',
    price: 10,
    currency: 'TND',
    currencyOrigin: 'queue',
    isActive: true,
    isDefault: true,
    displayOrder: 2,
  },
];
describe('queue service selection', () => {
  it('selects the configured default independently of price and notifications', () => {
    expect(preferredQueueService(services)?.tierId).toBe('premium');
    expect(
      preferredQueueService(
        services.map((item) => ({ ...item, isDefault: item.tierId === 'free' })),
      )?.tierId,
    ).toBe('free');
  });
  it('requires a choice for multiple services without a default', () => {
    expect(
      preferredQueueService(services.map((item) => ({ ...item, isDefault: false }))),
    ).toBeUndefined();
  });
  it('automatically uses a sole active service without designating it as default', () => {
    const sole = services.map((item) => ({
      ...item,
      isDefault: false,
      isActive: item.tierId === 'free',
    }));
    expect(preferredQueueService(sole)?.tierId).toBe('free');
    expect(preferredQueueService(sole)?.isDefault).toBe(false);
  });
  it('rejects disabled choices and disabled defaults', () => {
    expect(
      preferredQueueService(
        services.map((item) => ({ ...item, isActive: false })),
        'premium',
      ),
    ).toBeUndefined();
  });
  it('preserves an explicit choice while its service remains active', () => {
    const { result, rerender } = renderHook(({ items }) => useQueueServiceSelection('a', items), {
      initialProps: { items: services },
    });
    act(() => result.current.setTierId('free'));
    rerender({ items: [...services] });
    expect(result.current.tierId).toBe('free');
    rerender({ items: services.map((item) => ({ ...item, isActive: item.tierId !== 'free' })) });
    expect(result.current.tierId).toBe('premium');
  });
  it('clears an old choice when the queue changes', () => {
    const { result, rerender } = renderHook(
      ({ queueId }) => useQueueServiceSelection(queueId, services),
      { initialProps: { queueId: 'a' } },
    );
    act(() => result.current.setTierId('free'));
    rerender({ queueId: 'b' });
    expect(result.current.tierId).toBe('premium');
  });
});
