import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { usePreferencesStore } from '@/core/theme/preferences-store';
import { useContextLocale } from './use-context-locale';

describe('context language defaults', () => {
  afterEach(() => {
    usePreferencesStore.getState().setLocale('fr');
  });
  it('applies the context once, allows a manual choice and restores the previous locale on exit', () => {
    usePreferencesStore.getState().setLocale('en');
    const { rerender, unmount } = renderHook(
      ({ locale }) => {
        useContextLocale('site-1', locale);
      },
      {
        initialProps: { locale: 'ar-tn' },
      },
    );
    expect(usePreferencesStore.getState().locale).toBe('ar-TN');
    act(() => {
      usePreferencesStore.getState().setLocale('fr');
    });
    rerender({ locale: 'ar-tn' });
    expect(usePreferencesStore.getState().locale).toBe('fr');
    unmount();
    expect(usePreferencesStore.getState().locale).toBe('en');
  });
  it('waits for a known context locale and follows a new ticket', () => {
    const { rerender, unmount } = renderHook(
      ({ id, locale }) => {
        useContextLocale(id, locale);
      },
      {
        initialProps: { id: 'ticket-1', locale: undefined as string | undefined },
      },
    );
    expect(usePreferencesStore.getState().locale).toBe('fr');
    rerender({ id: 'ticket-1', locale: 'en' });
    expect(usePreferencesStore.getState().locale).toBe('en');
    rerender({ id: 'ticket-2', locale: 'ar' });
    expect(usePreferencesStore.getState().locale).toBe('ar');
    unmount();
    expect(usePreferencesStore.getState().locale).toBe('fr');
  });
});
