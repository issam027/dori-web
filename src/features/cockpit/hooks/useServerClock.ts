import { useEffect, useState } from 'react';

export function useServerClock(serverTime: unknown): number {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const clientReference = Date.now();
    const parsed = typeof serverTime === 'string' ? Date.parse(serverTime) : Number.NaN;
    const offset = Number.isNaN(parsed) ? 0 : parsed - clientReference;
    const update = () => {
      setNow(Date.now() + offset);
    };
    const initialTimer = window.setTimeout(update, 0);
    const timer = window.setInterval(update, 15_000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, [serverTime]);

  return now;
}

export function elapsedMinutes(value: unknown, now: number): number | null {
  if (typeof value !== 'string') return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return Math.max(0, Math.floor((now - timestamp) / 60_000));
}
