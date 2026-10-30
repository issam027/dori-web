import { useSyncExternalStore } from 'react';

export const MOBILE_QUERY = '(max-width: 620px), (max-width: 960px) and (max-height: 500px)';

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      if (typeof window.matchMedia !== 'function') return () => undefined;
      const media = window.matchMedia(query);
      media.addEventListener('change', notify);
      return () => {
        media.removeEventListener('change', notify);
      };
    },
    () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches,
    () => false,
  );
}
