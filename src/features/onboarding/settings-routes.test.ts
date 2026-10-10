import { describe, expect, it } from 'vitest';
import { settingsSectionFromPath } from './settings-routes';

describe('settingsSectionFromPath', () => {
  it.each([
    ['/settings/sites', 'sites'],
    ['/settings/queues', 'queues'],
    ['/settings/users', 'users'],
    ['/settings/tiers', 'tiers'],
    ['/settings/notifications', 'notifications'],
    ['/settings/translations', 'translations'],
  ] as const)('maps %s to %s', (path, section) => {
    expect(settingsSectionFromPath(path)).toBe(section);
  });

  it('falls back to sites for an unknown section', () => {
    expect(settingsSectionFromPath('/settings/unknown')).toBe('sites');
  });
});
