export const SETTINGS_SECTIONS = ['sites', 'queues', 'tiers'] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export function settingsSectionFromPath(pathname: string): SettingsSection {
  const candidate = pathname.split('/')[2];
  return SETTINGS_SECTIONS.find((section) => section === candidate) ?? 'sites';
}
