import { ALLOW_IDENTICAL } from './locales/allow-identical';
import { ar, arDomains } from './locales/ar';
import { arTN, arTNDomains } from './locales/ar-TN';
import { en, enDomains } from './locales/en';
import { fr, frDomains } from './locales/fr';
import { FORBIDDEN } from './glossary';
import { hasPluralSuffix, placeholdersMatch, referenceFor, stripPluralSuffix } from './placeholders';

type Catalog = Record<string, string>;
const catalogs: Record<'en' | 'ar' | 'ar-TN', Catalog> = { en, ar, 'ar-TN': arTN };
const frCatalog: Catalog = fr;
const frKeys = Object.keys(frCatalog);
const ARABIC = /[؀-ۿ]/;
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const AR_PLURAL = ['zero', 'one', 'two', 'few', 'many', 'other'];

describe('catalog structure', () => {
  it.each([
    ['fr', frDomains],
    ['en', enDomains],
    ['ar', arDomains],
    ['ar-TN', arTNDomains],
  ])('%s: a key is defined in exactly one domain file', (_locale, domains) => {
    const seen = new Map<string, string>();
    const duplicates: string[] = [];
    for (const [domain, entries] of Object.entries(domains as Record<string, Catalog>)) {
      for (const key of Object.keys(entries)) {
        if (seen.has(key)) duplicates.push(`${key} (${String(seen.get(key))} + ${domain})`);
        seen.set(key, domain);
      }
    }
    expect(duplicates).toEqual([]);
  });

  it.each(['en', 'ar'] as const)('%s defines every FR key and no unknown key', (locale) => {
    const catalog = catalogs[locale];
    expect(frKeys.filter((key) => !(key in catalog))).toEqual([]);
    const unknown = Object.keys(catalog).filter((key) => !(key in frCatalog) && !hasPluralSuffix(key));
    expect(unknown).toEqual([]);
  });

  it('ar-TN only overrides keys that exist in FR (or plural variants of them)', () => {
    const unknown = Object.keys(arTN).filter((key) => !(key in frCatalog) && !hasPluralSuffix(key));
    expect(unknown).toEqual([]);
  });

  it('has no empty value', () => {
    for (const [name, catalog] of Object.entries({ fr: frCatalog, ...catalogs })) {
      const empty = Object.entries(catalog).filter(([, value]) => value.trim() === '').map(([key]) => key);
      expect(empty, name).toEqual([]);
    }
  });

  it('has no encoding artefact', () => {
    for (const [name, catalog] of Object.entries({ fr: frCatalog, ...catalogs })) {
      const broken = Object.entries(catalog)
        .filter(([, value]) => /�|Ã.|â€|\\u[0-9a-f]{4}/i.test(value))
        .map(([key]) => key);
      expect(broken, name).toEqual([]);
    }
    // "Nouvelle cl?" style truncation (French puts a space before "?")
    const lostAccent = Object.entries(frCatalog)
      .filter(([, value]) => /[a-zà-ÿ]\?$/.test(value))
      .map(([key]) => key);
    expect(lostAccent).toEqual([]);
  });

  it('FR contains no leftover English UI words', () => {
    const leaks = Object.entries(frCatalog)
      .filter(([, value]) => /\b(Threshold|Welcome|Defaults?|default|Scope)\b/.test(value))
      .map(([key, value]) => `${key}: ${value}`);
    expect(leaks).toEqual([]);
  });
});

describe('interpolation parameters', () => {
  it.each(['en', 'ar', 'ar-TN'] as const)('%s keeps the same {{placeholders}} as FR', (locale) => {
    const mismatches = Object.entries(catalogs[locale])
      .filter(([key, value]) => {
        const reference = referenceFor(frCatalog, key);
        return reference !== undefined && !placeholdersMatch(key, reference, value);
      })
      .map(([key]) => key);
    expect(mismatches).toEqual([]);
  });
});

describe('plurals', () => {
  const pluralBases = [...new Set(frKeys.filter((key) => key.endsWith('_other')).map(stripPluralSuffix))];

  it('has plural bases to check', () => {
    expect(pluralBases.length).toBeGreaterThan(0);
  });

  it.each(pluralBases)('%s: EN has one/other, AR has the six CLDR categories', (base) => {
    expect(en[`${base}_one`], `${base}_one (en)`).toBeTruthy();
    expect(en[`${base}_other`], `${base}_other (en)`).toBeTruthy();
    for (const category of AR_PLURAL) expect(ar[`${base}_${category}`], `${base}_${category} (ar)`).toBeTruthy();
  });

  it('no deprecated "_plural" suffix is left', () => {
    for (const catalog of [frCatalog, ...Object.values(catalogs)]) {
      expect(Object.keys(catalog).filter((key) => key.endsWith('_plural'))).toEqual([]);
    }
  });
});

describe('untranslated text (ratchet)', () => {
  it.each(['en', 'ar'] as const)('%s: only allow-listed keys may equal the French text', (locale) => {
    const allowed = new Set<string>(ALLOW_IDENTICAL[locale]);
    const catalog = catalogs[locale];
    const untranslated = frKeys.filter((key) => catalog[key] === frCatalog[key] && !allowed.has(key));
    expect(untranslated, 'translate these, or consciously add them to locales/allow-identical.ts').toEqual([]);
    const stale = [...allowed].filter((key) => catalog[key] !== frCatalog[key]);
    expect(stale, 'remove from allow-identical.ts').toEqual([]);
  });

  it('every Arabic value contains Arabic letters unless allow-listed', () => {
    const allowed = new Set<string>(ALLOW_IDENTICAL.ar);
    const latinOnly = Object.entries(ar)
      .filter(([key, value]) => !ARABIC.test(value) && !allowed.has(key))
      .map(([key, value]) => `${key}: ${value}`);
    expect(latinOnly).toEqual([]);
  });
});

describe('glossary and typography', () => {
  it.each(['en', 'ar', 'ar-TN'] as const)('%s respects the glossary', (locale) => {
    const violations: string[] = [];
    for (const [key, value] of Object.entries(catalogs[locale])) {
      for (const { pattern, reason } of FORBIDDEN[locale]) {
        if (pattern.test(value)) violations.push(`${key}: "${value}" → ${reason}`);
      }
    }
    expect(violations).toEqual([]);
  });
});

describe('Tunisian humour (ar-TN)', () => {
  const LOADING_KEYS = new Set(['common.saving', 'common.searching', 'common.creation']);
  const SERIOUS = [
    /^common\./,
    /receipt80mm|passageReceipt/,
    /^errors?\./,
    /^apiError/,
    /\.echec$/,
    /[Rr]eset/,
    /[Dd]elete/,
    /ceGuichetEstOccupe/,
    /^kiosk\.errors\./,
  ];
  const serious = Object.entries(arTN).filter(([key]) => SERIOUS.some((rule) => rule.test(key)));

  it('has no emoji', () => {
    expect(Object.entries(arTN).filter(([, v]) => EMOJI.test(v)).map(([k]) => k)).toEqual([]);
  });

  it('keeps labels, badges and column headers short (≤ 30 chars)', () => {
    const tooLong = serious
      .filter(([key]) => /^common\./.test(key) && !LOADING_KEYS.has(key))
      .filter(([, value]) => value.length > 30)
      .map(([key, value]) => `${key} (${String(value.length)}): ${value}`);
    expect(tooLong).toEqual([]);
  });

  it('reserves jokes for empty states, loaders and placeholders (none in serious keys)', () => {
    const jokes = serious
      .filter(([key]) => !LOADING_KEYS.has(key))
      .filter(([, value]) => /\.\.\.|…|!/.test(value))
      .map(([key, value]) => `${key}: ${value}`);
    expect(jokes).toEqual([]);
  });

  it('is genuinely derja, not just standard Arabic (spot checks)', () => {
    expect(arTN['common.search']).toBeTruthy();
    expect(arTN['common.inactive']).toContain('موش');
    expect(arTN['common.servi']).not.toBe(ar['common.servi']);
  });
});
