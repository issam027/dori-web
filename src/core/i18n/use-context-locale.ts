import { useEffect } from 'react';
import { usePreferencesStore } from '@/core/theme/preferences-store';
import { normalizeLocale } from './config';

/** A public context supplies its default once; manual changes remain possible. */
export function useContextLocale(
  identity: string | null | undefined,
  locale: string | null | undefined,
): void {
  useEffect(() => {
    if (!identity || !locale) return;
    const previous = usePreferencesStore.getState().locale;
    usePreferencesStore.getState().setLocale(normalizeLocale(locale));
    return () => {
      usePreferencesStore.getState().setLocale(previous);
    };
  }, [identity, locale]);
}
