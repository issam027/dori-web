/**
 * Public i18n facade.
 *
 * Keep application imports pointed at this module. Runtime initialization lives in
 * `instance.ts`; remote translation overlays live in `remote.ts`.
 */
export {
  enableMissingKeyReporting,
  ensureLocaleLoaded,
  i18n,
  setLanguage,
} from './instance';
export {
  getLoadedBundleVersion,
  loadTranslationBundle,
  sanitizeRemoteEntries,
  type LoadBundleOptions,
  type RejectedEntry,
  type TranslationCategory,
} from './remote';
