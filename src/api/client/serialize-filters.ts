type FilterValue = string | number | boolean | null | undefined;

export function serializeFilters(filters: Readonly<Record<string, FilterValue>>): URLSearchParams {
  const parameters = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue;
    parameters.set(key, String(value));
  }

  return parameters;
}
