import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';
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
    <svg
      viewBox="0 0 30 20"
      aria-hidden="true"
      focusable="false"
    >
      {/* Fond rouge */}
      <rect
        width="30"
        height="20"
        fill="#E70013"
      />

      {/* Disque blanc exactement centré dans le drapeau */}
      <circle
        cx="15"
        cy="10"
        r="5"
        fill="#FFFFFF"
      />

      {/* Croissant rouge : deux cercles décalés */}
      <circle
        cx="15"
        cy="10"
        r="3.75"
        fill="#E70013"
      />

      <circle
        cx="16"
        cy="10"
        r="3"
        fill="#FFFFFF"
      />

      {/*
        Étoile rouge à cinq branches.
        Centre : (16, 10), légèrement à droite du centre du disque.
        Pointe principale dirigée vers la gauche.
        Le tracé est défini explicitement pour maîtriser son orientation.
      */}
      <path
        fill="#E70013"
        d="
          M 13.75 10
          L 15.25 10.545
          L 15.305 12.141
          L 16.286 10.882
          L 17.82 11.322
          L 16.927 10
          L 17.82 8.678
          L 16.286 9.118
          L 15.305 7.859
          L 15.25 9.455
          Z
        "
      />
    </svg>
  );
}

export function LocaleSwitcher() {
  const { t } = useTranslation();
  const locale = usePreferencesStore((state) => state.locale);
  const setLocale = usePreferencesStore((state) => state.setLocale);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const activeLocale = locales.includes(locale as (typeof locales)[number])
    ? (locale as (typeof locales)[number])
    : 'fr';

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
    };
  }, [open]);

  return (
    <div className="locale-switcher" ref={rootRef}>
      <button
        className="locale-switcher-trigger"
        type="button"
        aria-label={`${t('locale.label')}: ${t(`locale.${activeLocale}`)}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={t(`locale.${activeLocale}`)}
        onClick={() => {
          setOpen((current) => !current);
        }}
      >
        <CountryFlag locale={activeLocale} />
      </button>
      {open ? (
        <div className="locale-switcher-menu" role="listbox" aria-label={t('locale.label')}>
          {locales.map((code) => (
            <button
              key={code}
              className="locale-switcher-option"
              type="button"
              role="option"
              aria-label={t(`locale.${code}`)}
              aria-selected={activeLocale === code}
              title={t(`locale.${code}`)}
              onClick={() => {
                setLocale(code);
                setOpen(false);
              }}
            >
              <CountryFlag locale={code} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
