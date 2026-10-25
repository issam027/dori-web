const PLURAL_SUFFIX = /_(zero|one|two|few|many|other|plural)$/;

/** Unique, sorted interpolation names: "{{ count, number }}" → ["count"]. */
export function extractPlaceholders(value: string): string[] {
  return [
    ...new Set(
      [...value.matchAll(/{{\s*([^},\s]+)[^}]*}}/g)].flatMap((match) =>
        match[1] ? [match[1]] : [],
      ),
    ),
  ].sort();
}

export const hasPluralSuffix = (key: string): boolean => PLURAL_SUFFIX.test(key);
export const stripPluralSuffix = (key: string): string => key.replace(PLURAL_SUFFIX, '');

/**
 * Compares a candidate translation with the reference (FR) one.
 * Plural variants may omit {{count}} ("one service"), but must never introduce unknown names.
 */
export function placeholdersMatch(key: string, reference: string, candidate: string): boolean {
  const expected = extractPlaceholders(reference);
  const received = extractPlaceholders(candidate);
  if (hasPluralSuffix(key)) return received.every((name) => expected.includes(name));
  return expected.length === received.length && expected.every((name, i) => name === received[i]);
}

/** Finds the French reference for a (possibly plural-suffixed) key. */
export function referenceFor(fr: Record<string, string>, key: string): string | undefined {
  if (key in fr) return fr[key];
  const base = stripPluralSuffix(key);
  return fr[base] ?? fr[`${base}_other`];
}
