import { renderHook } from '@testing-library/react';
import { useActiveCallNavigationGuard } from './useActiveCallNavigationGuard';

describe('useActiveCallNavigationGuard', () => {
  it('prevents closing the page while an active call exists', () => {
    const { rerender, unmount } = renderHook(
      ({ enabled }: { enabled: boolean }) => {
        useActiveCallNavigationGuard(enabled);
      },
      { initialProps: { enabled: true } },
    );
    const activeEvent = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(activeEvent);
    expect(activeEvent.defaultPrevented).toBe(true);

    rerender({ enabled: false });
    const inactiveEvent = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(inactiveEvent);
    expect(inactiveEvent.defaultPrevented).toBe(false);
    unmount();
  });
});
