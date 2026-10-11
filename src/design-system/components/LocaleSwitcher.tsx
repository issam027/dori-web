import { useTranslation } from 'react-i18next';
import { usePreferencesStore } from '@/core/theme/preferences-store';

const locales = [
  { code: 'fr', flag: String.fromCodePoint(0x1f1eb, 0x1f1f7) },
  { code: 'en', flag: String.fromCodePoint(0x1f1ec, 0x1f1e7) },
  { code: 'ar', flag: String.fromCodePoint(0x1f1f9, 0x1f1f3) },
] as const;

export function LocaleSwitcher() {
  const { t } = useTranslation();
  const locale = usePreferencesStore((state) => state.locale);
  const setLocale = usePreferencesStore((state) => state.setLocale);
  return (
    <div className="locale-switcher" role="group" aria-label={t('locale.label')}>
      {locales.map(({ code, flag }) => (
        <button
          key={code}
          className="locale-switcher-option"
          type="button"
          aria-label={t(`locale.${code}`)}
          aria-pressed={locale === code}
          title={t(`locale.${code}`)}
          onClick={() => {
            setLocale(code);
          }}
        >
          <span aria-hidden="true">{flag}</span>
        </button>
      ))}
    </div>
  );
}
