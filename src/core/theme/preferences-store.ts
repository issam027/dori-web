import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nextTheme, type Theme } from './theme';

interface PreferencesState {
  theme: Theme;
  locale: string;
  setTheme: (theme: Theme) => void;
  cycleTheme: () => void;
  setLocale: (locale: string) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: 'light',
      locale: 'fr',
      setTheme: (theme) => set({ theme }),
      cycleTheme: () => set((state) => ({ theme: nextTheme(state.theme) })),
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: 'dori-preferences',
      partialize: ({ theme, locale }) => ({ theme, locale }),
    },
  ),
);
