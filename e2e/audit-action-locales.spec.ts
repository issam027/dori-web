import { expect, test } from '@playwright/test';
import { apiEnvelope, installApiScenario } from './support/scenario-fixtures';
const cases = [
  ['fr', 'Confirmation de présence au rendez-vous'],
  ['en', 'Appointment check-in'],
  ['ar', 'تأكيد الحضور للموعد'],
  ['ar-TN', 'علّم اللي الحريف جا للرونديفو'],
] as const;
for (const [locale, label] of cases)
  for (const width of [390, 1440]) {
    test('audit actions use ' + locale + ' on ' + String(width), async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      let filteredAction: string | null = null;
      const event = {
        eventId: '11111111-1111-4111-8111-111111111111',
        action: 'registrations.checkIn',
        actorDisplayName: 'Ada',
        targetType: 'registration',
        targetDisplayName: 'PERF-01-001',
        outcome: 'success',
        occurredAt: '2026-11-02T12:00:00Z',
      };
      await installApiScenario(page, {
        profile: 'root',
        handlers: [
          async ({ path, route, url }) => {
            if (path === '/api/v1/audit-events') {
              filteredAction = url.searchParams.get('action');
              await route.fulfill({
                json: apiEnvelope({
                  page: 1,
                  pageSize: 25,
                  total: 1,
                  totalPages: 1,
                  items: [event],
                }),
              });
              return true;
            }
            if (path === '/api/v1/audit-events/' + event.eventId) {
              await route.fulfill({
                json: apiEnvelope({ ...event, actionDisplayName: 'Ancien libellé français' }),
              });
              return true;
            }
            return false;
          },
        ],
      });
      await page.addInitScript((locale) => {
        localStorage.setItem(
          'dori-preferences',
          JSON.stringify({ state: { locale, theme: 'light', accentColor: 'lagoon' }, version: 0 }),
        );
      }, locale);
      await page.goto('/audit');
      const list = page.locator(
        width === 390 ? '.responsive-data-table-mobile' : '.responsive-data-table-desktop',
      );
      await expect(list.getByText(label, { exact: true })).toBeVisible();
      await expect(list.getByText('registrations.checkIn', { exact: true })).toHaveCount(0);
      const option = page.locator('select option[value="registrations.checkIn"]');
      await expect(option).toHaveText(label);
      if (width === 1440) {
        await page.locator('.admin-filter-card summary').click();
        await option.locator('..').selectOption('registrations.checkIn');
        await expect.poll(() => filteredAction).toBe('registrations.checkIn');
      }
      await list.getByRole('button').first().click();
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText(label, { exact: true })).toBeVisible();
      await expect(dialog.getByText('Ancien libellé français', { exact: true })).toHaveCount(0);
      if (width === 390) await dialog.locator('details summary').click();
      await expect(
        dialog.locator('code').filter({ hasText: 'registrations.checkIn' }),
      ).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    });
  }
