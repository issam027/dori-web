type Forbidden = { pattern: RegExp; reason: string };
const AR_LETTERS = '\\u0600-\\u06FF';
const arWord = (w: string) => new RegExp(`(?<![${AR_LETTERS}])${w}`);

export const FORBIDDEN: Record<'fr' | 'en' | 'ar' | 'ar-TN', Forbidden[]> = {
  fr: [{ pattern: /[←→]/, reason: 'les flèches directionnelles doivent être des icônes' }],
  en: [
    { pattern: /\bservice tier\b/i, reason: 'use "service level"' },
    { pattern: /\bappts?\./i, reason: 'do not abbreviate "appointments"' },
    { pattern: /\bDORI\b/, reason: 'brand is DORIFY' },
    { pattern: /[←→]/, reason: 'direction arrows must be icons' },
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
