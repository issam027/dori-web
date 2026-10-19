export const SUPPORTED_LOCALES = ['fr', 'en', 'ar', 'ar-TN'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'fr';

/** `tn` is the ISO 639-1 code of Setswana. Tunisian Arabic is `aeb` / `ar-TN` (BCP 47). */
export const LEGACY_LOCALE_ALIASES: Record<string, SupportedLocale> = {
  tn: 'ar-TN',
  'ar-tn': 'ar-TN',
  aeb: 'ar-TN',
};

/**
 * Locale code expected by the translation service. ASSUMPTION: the backend still uses `tn`.
 * If the backend has been (or gets) migrated to `ar-TN`, delete this entry.
 */
export const BACKEND_LOCALE_CODES: Partial<Record<SupportedLocale, string>> = {
  'ar-TN': 'tn',
};

export const RTL_LOCALES: ReadonlySet<SupportedLocale> = new Set<SupportedLocale>(['ar', 'ar-TN']);

/** Resolution order for a missing key. Never "translate" by silently copying French into EN/AR. */
export const FALLBACK_CHAIN: Record<string, string[]> = {
  'ar-TN': ['ar', 'fr'],
  ar: ['fr'],
  en: ['fr'],
  default: ['fr'],
};

export function normalizeLocale(input: string | null | undefined): SupportedLocale {
  if (!input) return DEFAULT_LOCALE;
  const lower = input.trim().toLowerCase().replace(/_/g, '-');
  const legacy = LEGACY_LOCALE_ALIASES[lower];
  if (legacy) return legacy;
  const exact = SUPPORTED_LOCALES.find((l) => l.toLowerCase() === lower);
  if (exact) return exact;
  const base = lower.split(/[-_]/)[0];
  return SUPPORTED_LOCALES.find((l) => l === base) ?? DEFAULT_LOCALE;
}

export function toBackendLocale(locale: SupportedLocale): string {
  return BACKEND_LOCALE_CODES[locale] ?? locale;
}

export function fromBackendLocale(code: string): SupportedLocale {
  return normalizeLocale(code);
}

export function isRtl(locale: string): boolean {
  return RTL_LOCALES.has(normalizeLocale(locale));
}

export function getDirection(locale: string): 'rtl' | 'ltr' {
  return isRtl(locale) ? 'rtl' : 'ltr';
}
