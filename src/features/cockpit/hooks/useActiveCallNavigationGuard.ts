import { useEffect } from 'react';

export function useActiveCallNavigationGuard(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const listener = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', listener);
    return () => {
      window.removeEventListener('beforeunload', listener);
    };
  }, [enabled]);
}
