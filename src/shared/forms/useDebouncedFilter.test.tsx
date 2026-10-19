import { act, renderHook } from '@testing-library/react';
import { useDebouncedFilter } from './useDebouncedFilter';

describe('useDebouncedFilter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('publishes a normalized value only after the configured threshold and delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedFilter(value, { delay: 350, minimumLength: 4 }),
      { initialProps: { value: ' abc ' } },
    );

    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(result.current).toBe('');

    rerender({ value: ' abcd ' });
    act(() => {
      vi.advanceTimersByTime(349);
    });
    expect(result.current).toBe('');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('abcd');
  });

  it('cancels the previous publication during a typing burst and clears below the threshold', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedFilter(value, { delay: 300, minimumLength: 4 }),
      { initialProps: { value: 'abcd' } },
    );

    act(() => {
      vi.advanceTimersByTime(200);
    });
    rerender({ value: 'abcde' });
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe('');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('abcde');

    rerender({ value: 'abc' });
    expect(result.current).toBe('');
  });
});
