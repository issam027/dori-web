import { expect, it } from 'vitest';
import { kioskIdleMs } from './useKioskWatchdog';

it('uses a safe configurable kiosk timeout', () => {
  expect(kioskIdleMs('45000')).toBe(45000);
  expect(kioskIdleMs('1000')).toBe(30000);
  expect(kioskIdleMs(undefined)).toBe(30000);
});
