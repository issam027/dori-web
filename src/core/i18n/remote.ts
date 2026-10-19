import { translationsControllerGetBundle } from '@/api/generated/translations/translations';
import type { TranslationsControllerGetBundleCategory } from '@/api/generated/models';
import { normalizeLocale, toBackendLocale } from './config';
import { ensureLocaleLoaded, i18n, setLanguage } from './instance';
import { fr } from './locales/fr';
import { extractPlaceholders, placeholdersMatch, referenceFor } from './placeholders';

export type TranslationCategory = TranslationsControllerGetBundleCategory;

export interface RejectedEntry {
  key: string;
  reason: 'placeholder-mismatch' | 'not-a-string';
  expected?: string[];
  received?: string[];
}

export interface LoadBundleOptions {
  /** Re-apply the bundle even if its version is already loaded. */
  force?: boolean;
  /** Also make this locale the active language. Default false: loading ≠ switching. */
  activate?: boolean;
  /** Called with entries refused by validation. Defaults to console.warn. */
  onRejected?: (entries: RejectedEntry[]) => void;
}

const loadedBundleVersions = new Map<string, number>();
const bundleRequests = new Map<string, Promise<number>>();

/**
 * TRANSITIONAL: some remote catalogs still contain the old brand "DORI".
 * Fix the data in the translation service, then delete this function.
 */
const fixLegacyBrand = (value: string) => value.replace(/\bDORI\b/g, 'DORIFY');

export function sanitizeRemoteEntries(entries: Record<string, unknown>): {
  accepted: Record<string, string>;
  rejected: RejectedEntry[];
} {
  const accepted: Record<string, string> = {};
  const rejected: RejectedEntry[] = [];
  for (const [rawKey, value] of Object.entries(entries)) {
    const key = rawKey;
    if (typeof value !== 'string') {
      rejected.push({ key, reason: 'not-a-string' });
      continue;
    }
    const text = fixLegacyBrand(value);
    const reference = referenceFor(fr, key);
    // A broken {{placeholder}} would crash or garble a screen in production: keep the local text.
    if (reference !== undefined && !placeholdersMatch(key, reference, text)) {
      rejected.push({
        key,
        reason: 'placeholder-mismatch',
        expected: extractPlaceholders(reference),
        received: extractPlaceholders(text),
      });
      continue;
    }
    accepted[key] = text;
  }
  return { accepted, rejected };
}

export async function loadTranslationBundle(
  locale: string,
  category: TranslationCategory = 'ihm',
  options: boolean | LoadBundleOptions = {},
): Promise<number> {
  // Legacy signature: loadTranslationBundle(locale, category, force)
  const opts: LoadBundleOptions = typeof options === 'boolean' ? { force: options } : options;
  const target = normalizeLocale(locale);
  const requestKey = `${target}:${category}:${opts.force ? 'force' : 'normal'}:${opts.activate ? 'activate' : 'load'}`;
  const pending = bundleRequests.get(requestKey);
  if (pending) return pending;

  const request = (async () => {
    await ensureLocaleLoaded(target);
    const response = await translationsControllerGetBundle({
      locale: toBackendLocale(target),
      category,
    });
    const bundle = response.data;
    const cacheKey = `${target}:${category}`;

    if (opts.force || loadedBundleVersions.get(cacheKey) !== bundle.version) {
      const { accepted, rejected } = sanitizeRemoteEntries(bundle.entries);
      // Merge: removing the whole namespace would erase translations loaded for other categories.
      i18n.addResourceBundle(target, 'translation', accepted, true, true);
      loadedBundleVersions.set(cacheKey, bundle.version);
      if (rejected.length > 0) {
        if (opts.onRejected) opts.onRejected(rejected);
        else console.warn(`[i18n] ${String(rejected.length)} remote entr(ies) rejected for ${cacheKey}`, rejected);
      }
    }
    if (opts.activate) await setLanguage(target);
    return bundle.version;
  })().finally(() => {
    bundleRequests.delete(requestKey);
  });
  bundleRequests.set(requestKey, request);
  return request;
}

export function getLoadedBundleVersion(
  locale: string,
  category: TranslationCategory = 'ihm',
): number | undefined {
  return loadedBundleVersions.get(`${normalizeLocale(locale)}:${category}`);
}
