import { useEffect } from 'react';
import { i18n } from '@/core/i18n/i18n';
import { usePreferencesStore } from '@/core/theme/preferences-store';

export function PreferenceSynchronizer() {
  const locale = usePreferencesStore((state) => state.locale);
  const theme = usePreferencesStore((state) => state.theme);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = ['ar', 'fa', 'he', 'ur'].includes(locale.split('-')[0] ?? '')
      ? 'rtl'
      : 'ltr';
    void i18n.changeLanguage(locale);
  }, [locale]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return null;
}
