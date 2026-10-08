import { useCallback, useEffect, useRef, useState } from 'react';

export const kioskIdleMs = (raw: unknown) => {
  const value = Number(raw);
  return Number.isFinite(value) && value >= 15_000 ? value : 30_000;
};

export function useKioskWatchdog(onExpire: () => void, timeoutMs: number) {
  const [remaining, setRemaining] = useState(timeoutMs);
  const deadline = useRef<number | null>(null);
  const prolong = useCallback(() => {
    deadline.current = Date.now() + timeoutMs;
    setRemaining(timeoutMs);
  }, [timeoutMs]);
  useEffect(() => {
    deadline.current = Date.now() + timeoutMs;
    const activity = () => {
      prolong();
    };
    for (const event of ['pointerdown', 'keydown'] as const)
      window.addEventListener(event, activity);
    const timer = window.setInterval(() => {
      const next = Math.max(0, (deadline.current ?? Date.now()) - Date.now());
      setRemaining(next);
      if (next === 0) {
        onExpire();
        prolong();
      }
    }, 1000);
    return () => {
      window.clearInterval(timer);
      for (const event of ['pointerdown', 'keydown'] as const)
        window.removeEventListener(event, activity);
    };
  }, [onExpire, prolong, timeoutMs]);
  return { remainingSeconds: Math.ceil(remaining / 1000), warning: remaining <= 15_000, prolong };
}
