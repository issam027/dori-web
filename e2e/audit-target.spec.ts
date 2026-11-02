import { expect, test } from '@playwright/test';
import { apiEnvelope, installApiScenario } from './support/scenario-fixtures';
for (const width of [1280, 1440, 1920]) {
  test(
    'long audit targets are truncated without table scrolling at ' + String(width),
    async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const target = 'Agence-' + 'identifiant-ou-nom-tres-long-'.repeat(20);
      await installApiScenario(page, {
        profile: 'root',
        handlers: [
          async ({ path, route }) => {
            if (path !== '/api/v1/audit-events') return false;
            await route.fulfill({
              json: apiEnvelope({
                page: 1,
                pageSize: 25,
                total: 1,
                totalPages: 1,
                items: [
                  {
                    eventId: 'audit-long',
                    actorDisplayName: 'Ada Lovelace',
                    action: 'site.update',
                    targetDisplayName: target,
                    targetType: 'site',
                    outcome: 'success',
                    occurredAt: '2026-11-02T12:00:00Z',
                  },
                ],
              }),
            });
            return true;
          },
        ],
      });
      await page.goto('/audit');
      const label = page.locator('.audit-target-label');
      await expect(label).toHaveAttribute('title', target);
      await expect(label).toHaveCSS('text-overflow', 'ellipsis');
      expect(await label.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(
        true,
      );
      const table = page.locator('.table-scroll').filter({ has: label });
      expect(
        await table.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
      ).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    },
  );
}
