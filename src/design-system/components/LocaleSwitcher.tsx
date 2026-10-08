import { useTranslation } from 'react-i18next';
import { usePreferencesStore } from '@/core/theme/preferences-store';

const locales = ['fr', 'en', 'ar'] as const;

export function LocaleSwitcher() {
  const { t } = useTranslation();
  const locale = usePreferencesStore((state) => state.locale);
  const setLocale = usePreferencesStore((state) => state.setLocale);
  return (
    <label className="locale-switcher">
      <span className="sr-only">{t('locale.label')}</span>
      <select
        value={locale}
        onChange={(event) => {
          setLocale(event.target.value);
        }}
        aria-label={t('locale.label')}
      >
        {locales.map((item) => (
          <option key={item} value={item}>
            {t(`locale.${item}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
