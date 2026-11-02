import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nextTheme, type AccentColor, type Theme } from './theme';

interface PreferencesState {
  theme: Theme;
  ticketPaperWidthMm: 58 | 80;
  setTicketPaperWidthMm: (width: 58 | 80) => void;
  locale: string;
  accentColor: AccentColor;
  setTheme: (theme: Theme) => void;
  cycleTheme: () => void;
  setLocale: (locale: string) => void;
  setAccentColor: (accentColor: AccentColor) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: 'light',
      ticketPaperWidthMm: 58,
      setTicketPaperWidthMm: (ticketPaperWidthMm) => set({ ticketPaperWidthMm }),
      locale: 'fr',
      accentColor: 'lagoon',
      setTheme: (theme) => set({ theme }),
      cycleTheme: () => set((state) => ({ theme: nextTheme(state.theme) })),
      setLocale: (locale) => set({ locale }),
      setAccentColor: (accentColor) => set({ accentColor }),
    }),
    {
      name: 'dori-preferences',
      partialize: ({ theme, locale, accentColor, ticketPaperWidthMm }) => ({
        theme,
        locale,
        accentColor,
        ticketPaperWidthMm,
      }),
    },
  ),
);
