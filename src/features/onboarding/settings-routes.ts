export const SETTINGS_SECTIONS = [
  'sites',
  'queues',
  'users',
  'tiers',
  'notifications',
  'translations',
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export function settingsSectionFromPath(pathname: string): SettingsSection {
  const candidate = pathname.split('/')[2];
  return SETTINGS_SECTIONS.find((section) => section === candidate) ?? 'sites';
}
