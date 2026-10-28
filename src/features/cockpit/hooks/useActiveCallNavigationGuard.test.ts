import { renderHook } from '@testing-library/react';
import { useActiveCallNavigationGuard } from './useActiveCallNavigationGuard';

describe('useActiveCallNavigationGuard', () => {
  it('prevents closing the page while an active call exists', () => {
    const { rerender, unmount } = renderHook(
      ({ enabled }: { enabled: boolean }) => {
        useActiveCallNavigationGuard(enabled, 'Leave?');
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

  it('blocks internal link navigation when the operator refuses confirmation', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderHook(() => {
      useActiveCallNavigationGuard(true, 'Leave?');
    });
    const link = document.createElement('a');
    link.href = '/profile';
    document.body.append(link);
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    link.dispatchEvent(event);
    expect(confirm).toHaveBeenCalledWith('Leave?');
    expect(event.defaultPrevented).toBe(true);
    link.remove();
  });
});
