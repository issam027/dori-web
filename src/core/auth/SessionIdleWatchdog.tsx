import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { clearSession } from './session-actions';
import { sessionIdleMilliseconds } from './session-idle-policy';
import { useSessionStore } from './session-store';

const activityEvents = ['pointerdown', 'keydown', 'touchstart', 'scroll'] as const;

export function SessionIdleWatchdog(): null {
  const queryClient = useQueryClient();
  const status = useSessionStore((state) => state.status);
  const userType = useSessionStore((state) => state.user?.userType);
  const logoutStarted = useRef(false);

  useEffect(() => {
    if (status !== 'authenticated' || userType !== 'human') return;
    logoutStarted.current = false;
    const timeoutMs = sessionIdleMilliseconds(import.meta.env.VITE_SESSION_IDLE_MINUTES);
    let timeout = 0;
    const logout = () => {
      if (logoutStarted.current) return;
      logoutStarted.current = true;
      void clearSession(queryClient);
    };
    const schedule = () => {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(logout, timeoutMs);
    };
    for (const event of activityEvents)
      window.addEventListener(event, schedule, { passive: true, capture: true });
    schedule();
    return () => {
      window.clearTimeout(timeout);
      for (const event of activityEvents)
        window.removeEventListener(event, schedule, { capture: true });
    };
  }, [queryClient, status, userType]);

  return null;
}
