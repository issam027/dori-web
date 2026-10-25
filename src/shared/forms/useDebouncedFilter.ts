import { useEffect, useMemo, useState } from 'react';

interface DebouncedFilterOptions {
  delay?: number;
  minimumLength?: number;
  normalize?: (value: string) => string;
}

const normalizeSearch = (value: string) => value.trim();

export function useDebouncedFilter(
  value: string,
  { delay = 350, minimumLength = 4, normalize = normalizeSearch }: DebouncedFilterOptions = {},
): string {
  const normalizedValue = useMemo(() => normalize(value), [normalize, value]);
  const eligible = normalizedValue.length >= minimumLength;
  const [debouncedValue, setDebouncedValue] = useState('');

  useEffect(() => {
    if (!eligible) return;
    const timeout = window.setTimeout(() => {
      setDebouncedValue(normalizedValue);
    }, delay);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [delay, eligible, normalizedValue]);

  return eligible ? debouncedValue : '';
}
