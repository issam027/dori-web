import { useTranslation } from 'react-i18next';
import { usePreferencesStore } from '@/core/theme/preferences-store';

const locales = ['fr', 'en', 'ar'] as const;

function CountryFlag({ locale }: { locale: (typeof locales)[number] }) {
  if (locale === 'fr') {
    return (
      <svg viewBox="0 0 30 20" aria-hidden="true">
        <path fill="#002395" d="M0 0h10v20H0z" />
        <path fill="#fff" d="M10 0h10v20H10z" />
        <path fill="#ed2939" d="M20 0h10v20H20z" />
      </svg>
    );
  }
  if (locale === 'en') {
    return (
      <svg viewBox="0 0 30 20" aria-hidden="true">
        <path fill="#012169" d="M0 0h30v20H0z" />
        <path stroke="#fff" strokeWidth="4" d="m0 0 30 20M30 0 0 20" />
        <path stroke="#c8102e" strokeWidth="2" d="m0 0 30 20M30 0 0 20" />
        <path stroke="#fff" strokeWidth="7" d="M15 0v20M0 10h30" />
        <path stroke="#c8102e" strokeWidth="4" d="M15 0v20M0 10h30" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 30 20" aria-hidden="true">
      <path fill="#e70013" d="M0 0h30v20H0z" />
      <circle cx="15" cy="10" r="6" fill="#fff" />
      <circle cx="16.5" cy="10" r="4.5" fill="#e70013" />
      <circle cx="18" cy="10" r="3.5" fill="#fff" />
      <path
        fill="#e70013"
        d="m18.2 6.7.8 2.1 2.2.1-1.7 1.4.6 2.2-1.9-1.2-1.9 1.2.6-2.2-1.7-1.4 2.2-.1z"
      />
    </svg>
  );
}

export function LocaleSwitcher() {
  const { t } = useTranslation();
  const locale = usePreferencesStore((state) => state.locale);
  const setLocale = usePreferencesStore((state) => state.setLocale);
  return (
    <div className="locale-switcher" role="group" aria-label={t('locale.label')}>
      {locales.map((code) => (
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
          <CountryFlag locale={code} />
        </button>
      ))}
    </div>
  );
}
