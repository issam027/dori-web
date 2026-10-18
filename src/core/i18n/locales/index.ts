import type { SupportedLocale } from '../config';
import { fr } from './fr';

/** FR is bundled (source of truth + universal fallback). Other locales are split into async chunks. */
export const localeLoaders: Record<SupportedLocale, () => Promise<Record<string, string>>> = {
  fr: async () => fr,
  en: async () => (await import('./en')).en,
  ar: async () => (await import('./ar')).ar,
  'ar-TN': async () => (await import('./ar-TN')).arTN,
};

export { fr };
