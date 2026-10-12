export const themes = ['light', 'soft-light', 'soft-dark', 'dark'] as const;
export type Theme = (typeof themes)[number];

export function nextTheme(theme: Theme): Theme {
  const index = themes.indexOf(theme);
  return themes[(index + 1) % themes.length] ?? 'light';
}

export const accentColors = [
  {
    id: 'lagoon',
    value: '#087477',
    darkValue: '#37b9b5',
    labelKey: 'profile.appearance.colors.lagoon',
  },
  {
    id: 'ocean',
    value: '#0369a1',
    darkValue: '#38bdf8',
    labelKey: 'profile.appearance.colors.ocean',
  },
  {
    id: 'royal',
    value: '#4338ca',
    darkValue: '#818cf8',
    labelKey: 'profile.appearance.colors.royal',
  },
  {
    id: 'iris',
    value: '#6d28d9',
    darkValue: '#a78bfa',
    labelKey: 'profile.appearance.colors.iris',
  },
  {
    id: 'orchid',
    value: '#a21caf',
    darkValue: '#e879f9',
    labelKey: 'profile.appearance.colors.orchid',
  },
  {
    id: 'berry',
    value: '#be185d',
    darkValue: '#f472b6',
    labelKey: 'profile.appearance.colors.berry',
  },
  {
    id: 'coral',
    value: '#c2415b',
    darkValue: '#fb7185',
    labelKey: 'profile.appearance.colors.coral',
  },
  {
    id: 'ember',
    value: '#c2410c',
    darkValue: '#fb923c',
    labelKey: 'profile.appearance.colors.ember',
  },
  {
    id: 'amber',
    value: '#a16207',
    darkValue: '#fbbf24',
    labelKey: 'profile.appearance.colors.amber',
    darkContrast: true,
  },
  {
    id: 'lime',
    value: '#4d7c0f',
    darkValue: '#a3e635',
    labelKey: 'profile.appearance.colors.lime',
    darkContrast: true,
  },
  {
    id: 'forest',
    value: '#15803d',
    darkValue: '#4ade80',
    labelKey: 'profile.appearance.colors.forest',
    darkContrast: true,
  },
  {
    id: 'mint',
    value: '#047857',
    darkValue: '#34d399',
    labelKey: 'profile.appearance.colors.mint',
    darkContrast: true,
  },
  {
    id: 'slate',
    value: '#475569',
    darkValue: '#94a3b8',
    labelKey: 'profile.appearance.colors.slate',
    darkContrast: true,
  },
  {
    id: 'graphite',
    value: '#334155',
    darkValue: '#cbd5e1',
    labelKey: 'profile.appearance.colors.graphite',
    darkContrast: true,
  },
  {
    id: 'cocoa',
    value: '#785548',
    darkValue: '#c89f91',
    labelKey: 'profile.appearance.colors.cocoa',
    darkContrast: true,
  },
  {
    id: 'wine',
    value: '#881337',
    darkValue: '#fb7185',
    labelKey: 'profile.appearance.colors.wine',
  },
] as const;

export type AccentColor = (typeof accentColors)[number]['id'];
