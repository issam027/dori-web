import { useEffect } from 'react';
import { i18n, loadTranslationBundle } from '@/core/i18n/i18n';
import { usePreferencesStore } from '@/core/theme/preferences-store';
import { accentColors } from '@/core/theme/theme';

export function PreferenceSynchronizer() {
  const locale = usePreferencesStore((state) => state.locale);
  const theme = usePreferencesStore((state) => state.theme);
  const accentColor = usePreferencesStore((state) => state.accentColor);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = ['ar', 'fa', 'he', 'ur'].includes(locale.split('-')[0] ?? '')
      ? 'rtl'
      : 'ltr';
    void loadTranslationBundle(locale, 'ihm').catch(() => i18n.changeLanguage(locale));
  }, [locale]);

  useEffect(() => {
    const root = document.documentElement;
    const accent = accentColors.find((item) => item.id === accentColor) ?? accentColors[0];
    const dark = theme === 'dark' || theme === 'soft-dark';
    const color = dark ? accent.darkValue : accent.value;

    root.dataset.theme = theme;
    root.style.setProperty('--color-accent', color);
    root.style.setProperty(
      '--color-primary-soft',
      `color-mix(in srgb, ${color} 16%, var(--color-surface))`,
    );
    root.style.setProperty('--color-primary-contrast', dark ? '#07151f' : '#ffffff');
  }, [accentColor, theme]);

  return null;
}
