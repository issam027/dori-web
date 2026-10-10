import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { NormalizedApiError } from '@/core/errors/normalized-api-error';
import { useBusinessMutation } from './use-business-mutation';

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe('useBusinessMutation', () => {
  it('shares the in-flight request when an action is submitted twice', async () => {
    let resolveRequest: ((value: string) => void) | undefined;
    const mutationFn = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    const { result } = renderHook(
      () => useBusinessMutation({ mutationFn: () => mutationFn() }),
      { wrapper },
    );

    let first: Promise<string> | undefined;
    let second: Promise<string> | undefined;
    act(() => {
      first = result.current.execute(1);
      second = result.current.execute(1);
    });
    expect(first).toBe(second);
    await waitFor(() => {
      expect(mutationFn).toHaveBeenCalledTimes(1);
    });

    resolveRequest?.('done');
    await expect(first).resolves.toBe('done');
  });

  it('exposes the correlation ID through the common error presentation', async () => {
    const error = new NormalizedApiError(
      'CONFLICT',
      'apiErrors.CONFLICT',
      {},
      undefined,
      'corr-business-42',
      409,
    );
    const { result } = renderHook(
      () =>
        useBusinessMutation({
          mutationFn: async () => Promise.reject(error),
          expectedErrorStatuses: [409],
        }),
      { wrapper },
    );

    await act(async () => {
      await expect(result.current.execute(1)).rejects.toBe(error);
    });
    await waitFor(() => {
      expect(result.current.errorPresentation?.correlationId).toBe('corr-business-42');
    });
  });
});
