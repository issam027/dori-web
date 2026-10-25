import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import {
  DEFAULT_LOCALE,
  FALLBACK_CHAIN,
  getDirection,
  normalizeLocale,
  type SupportedLocale,
} from './config';
import { fr, localeLoaders } from './locales';

void i18n.use(initReactI18next).init({
  // FR is the only bundled catalog. EN / AR / ar-TN are loaded on demand (see ensureLocaleLoaded).
  resources: { fr: { fallback: fr } },
  lng: DEFAULT_LOCALE,
  // Missing keys follow an explicit chain (ar-TN → ar → fr, en → fr, …). Nothing is copied silently.
  fallbackLng: FALLBACK_CHAIN,
  ns: ['translation', 'fallback'],
  defaultNS: 'translation',
  fallbackNS: 'fallback',
  interpolation: { escapeValue: false },
  returnNull: false,
});

function applyDocumentLocale(lng: string): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lng;
  document.documentElement.dir = getDirection(lng);
}
i18n.on('languageChanged', applyDocumentLocale);

const pendingLocales = new Map<SupportedLocale, Promise<void>>();

function loadOne(locale: SupportedLocale): Promise<void> {
  if (i18n.hasResourceBundle(locale, 'fallback')) return Promise.resolve();
  let pending = pendingLocales.get(locale);
  if (!pending) {
    pending = localeLoaders[locale]()
      .then((catalog) => {
        i18n.addResourceBundle(locale, 'fallback', catalog, true, false);
      })
      .catch((error: unknown) => {
        pendingLocales.delete(locale); // allow a retry after a network/chunk failure
        throw error;
      });
    pendingLocales.set(locale, pending);
  }
  return pending;
}

/** Loads the local catalog of a locale and of its fallback chain. Does NOT change the active language. */
export async function ensureLocaleLoaded(input: string): Promise<SupportedLocale> {
  const locale = normalizeLocale(input);
  const chain = [locale, ...(FALLBACK_CHAIN[locale] ?? [])] as SupportedLocale[];
  await Promise.all(chain.map(loadOne));
  return locale;
}

/** The one way to switch the UI language: loads catalogs first, then activates (also sets lang/dir). */
export async function setLanguage(input: string): Promise<SupportedLocale> {
  const locale = await ensureLocaleLoaded(input);
  await i18n.changeLanguage(locale);
  return locale;
}

export { i18n };
