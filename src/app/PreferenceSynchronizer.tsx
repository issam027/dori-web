import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { loadTranslationBundle, setLanguage } from '@/core/i18n/i18n';
import { usePreferencesStore } from '@/core/theme/preferences-store';
import { accentColors } from '@/core/theme/theme';
import { updateFavicon } from '@/core/theme/favicon';

export function PreferenceSynchronizer() {
  const location = useLocation();
  const locale = usePreferencesStore((state) => state.locale);
  const theme = usePreferencesStore((state) => state.theme);
  const accentColor = usePreferencesStore((state) => state.accentColor);

  useEffect(() => {
    const publicExperiencePaths = new Set(['/kiosk', '/display', '/track']);
    const category = publicExperiencePaths.has(location.pathname) ? 'public_ihm' : 'ihm';
    void setLanguage(locale).then(() => loadTranslationBundle(locale, category)).catch(() => undefined);
  }, [locale, location.pathname]);

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
    updateFavicon(color, dark ? '#07151f' : '#ffffff');
  }, [accentColor, theme]);

  return null;
}
