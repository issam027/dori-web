export const themes = ['light', 'soft-light', 'soft-dark', 'dark'] as const;
export type Theme = (typeof themes)[number];

export function nextTheme(theme: Theme): Theme {
  const index = themes.indexOf(theme);
  return themes[(index + 1) % themes.length] ?? 'light';
}
