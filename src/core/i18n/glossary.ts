/**
 * Terminology enforced by tests. One concept = one word per language.
 * The mapping documents the intended term; `forbidden` is what the tests reject.
 */
export const GLOSSARY = {
  queue: { fr: 'file', en: 'queue', ar: 'قائمة انتظار', 'ar-TN': 'قائمة انتظار' },
  counter: { fr: 'guichet', en: 'desk / counter', ar: 'شباك', 'ar-TN': 'شباك' },
  ticket: { fr: 'ticket', en: 'ticket', ar: 'تذكرة', 'ar-TN': 'تذكرة' },
  customer: { fr: 'client / personne', en: 'customer / person', ar: 'عميل / شخص', 'ar-TN': 'حريف' },
  serviceLevel: { fr: 'niveau de service', en: 'service level', ar: 'مستوى الخدمة', 'ar-TN': 'مستوى الخدمة' },
  brand: { fr: 'DORIFY', en: 'DORIFY', ar: 'DORIFY', 'ar-TN': 'DORIFY' },
} as const;

type Forbidden = { pattern: RegExp; reason: string };
const AR_LETTERS = '\\u0600-\\u06FF';
const arWord = (w: string) => new RegExp(`(?<![${AR_LETTERS}])${w}`);

export const FORBIDDEN: Record<'en' | 'ar' | 'ar-TN', Forbidden[]> = {
  en: [
    { pattern: /\bservice tier\b/i, reason: 'use "service level"' },
    { pattern: /\bappts?\./i, reason: 'do not abbreviate "appointments"' },
    { pattern: /\bDORI\b/, reason: 'brand is DORIFY' },
  ],
  ar: [
    { pattern: arWord('(ال)?طابور'), reason: 'use قائمة انتظار' },
    { pattern: arWord('(ال)?طوابير'), reason: 'use قوائم انتظار' },
    { pattern: arWord('(ال)?صف(وف)?(?![\\u0600-\\u06FF])'), reason: 'use قائمة انتظار' },
    { pattern: arWord('(ال)?مكتب(?![\\u0600-\\u06FF])'), reason: 'use شباك' },
    { pattern: arWord('(ال)?مكاتب'), reason: 'use شبابيك' },
    { pattern: arWord('(ال)?زبون'), reason: 'use عميل' },
    { pattern: /دوريفاي|دوريفي/, reason: 'brand is DORIFY (Latin script)' },
    { pattern: /[←→]/, reason: 'direction arrows are not mirrored in RTL: use mirrored icons' },
  ],
  'ar-TN': [
    { pattern: arWord('(ال)?طابور'), reason: 'use قائمة انتظار' },
    { pattern: /دوريفاي|دوريفي/, reason: 'brand is DORIFY (Latin script)' },
    { pattern: /[←→]/, reason: 'direction arrows are not mirrored in RTL: use mirrored icons' },
  ],
};
