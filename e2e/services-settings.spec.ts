import { expect, test } from '@playwright/test';
import {
  apiEnvelope,
  paginated,
  buildQueue,
  installApiScenario,
} from './support/scenario-fixtures';

for (const width of [320, 390, 1440]) {
  test(
    'service settings stay compact and save the selected queue at ' + width,
    async ({ page }) => {
      await page.setViewportSize({ width, height: 960 });
      const queues = [
        buildQueue({ currency: 'TND' }),
        buildQueue({
          queueId: '00000000-0000-4000-8000-000000000011',
          queueName: 'Documents',
          queueCode: 'DOC',
          currency: 'TND',
        }),
      ];
      const tiers = ['Standard', 'Premium', 'Express'].map((tierName, index) => ({
        tierId: '00000000-0000-4000-8000-00000000000' + (index + 1),
        tierName,
        tierCode: tierName.toUpperCase(),
        description: 'Service ' + tierName,
        isActive: true,
      }));
      const saved: { queueId: string; body: Record<string, unknown> }[] = [];
      await installApiScenario(page, {
        profile: 'admin',
        queues,
        tiers,
        handlers: [
          async ({ path, method, route }) => {
            const list = path.match(/^\/api\/v1\/queues\/([^/]+)\/tiers$/);
            if (list && method === 'GET') {
              await route.fulfill({
                json: apiEnvelope(
                  paginated(
                    tiers
                      .slice(0, 2)
                      .map((tier, index) => ({
                        ...tier,
                        queueId: list[1],
                        price: 5,
                        currencyOverride: null,
                        isDefault: index === 0,
                        displayOrder: index + 1,
                        isActive: true,
                      })),
                  ),
                ),
              });
              return true;
            }
            if (/\/tiers\/[^/]+\/rules$/.test(path)) {
              await route.fulfill({ json: apiEnvelope(paginated([])) });
              return true;
            }
            const item = path.match(/^\/api\/v1\/queues\/([^/]+)\/tiers\/([^/]+)$/);
            if (item && method === 'PATCH') {
              saved.push({ queueId: item[1]!, body: route.request().postDataJSON() });
              await route.fulfill({ json: apiEnvelope({}) });
              return true;
            }
            return false;
          },
        ],
      });
      await page.goto('/settings/tiers');
      const panel = page.locator('.services-panel');
      await expect(panel.locator('.tier-config-card')).toHaveCount(3);
      await expect(panel.locator('.queue-service-group')).toHaveCount(1);
      await expect(panel.locator('details[open]')).toHaveCount(0);
      await expect(panel.getByRole('button', { name: 'Express', exact: true })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
      await panel.getByRole('combobox').first().selectOption(queues[1]!.queueId);
      await expect(panel.locator('.queue-service-group > header')).toContainText('Documents');
      const card = panel.locator('.tier-config-card').first();
      await card.locator('summary').click();
      await expect(card.getByRole('spinbutton')).toHaveValue('5');
      await card.getByRole('spinbutton').fill('12.5');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(await card.evaluate((element) => element.clientWidth)).toBeGreaterThan(
        width < 720 ? width - 60 : 200,
      );
      if (width < 720) await expect(page.locator('.settings-card')).toHaveCSS('padding', '0px');
      await page.screenshot({ path: 'test-results/services-' + width + '.png', fullPage: true });
      await card.getByRole('button', { name: /^enregistrer$/i }).click();
      await expect.poll(() => saved.length).toBe(1);
      expect(saved[0]).toMatchObject({
        queueId: queues[1]!.queueId,
        body: { price: 12.5, currency: null, isDefault: true },
      });
    },
  );
}
