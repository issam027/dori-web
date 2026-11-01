import { expect, test } from '@playwright/test';
import {
  apiEnvelope,
  paginated,
  buildQueue,
  installApiScenario,
} from './support/scenario-fixtures';

for (const width of [320, 390, 1440]) {
  test('default is optional and independent of options at ' + width, async ({ page }) => {
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
    const tiers = ['Gratuit', 'Premium', 'Express'].map((tierName, index) => ({
      tierId: '00000000-0000-4000-8000-00000000000' + (index + 1),
      tierName,
      tierCode: tierName,
      description: 'Service ' + tierName,
      isActive: true,
      isSystem: index === 0,
    }));
    const defaults = new Map(queues.map((queue) => [queue.queueId, tiers[1]!.tierId]));
    const active = new Map(
      queues.map((queue) => [queue.queueId, new Set(tiers.slice(0, 2).map((tier) => tier.tierId))]),
    );
    const patches: { queueId: string; tierId: string; body: Record<string, unknown> }[] = [];
    let notificationWrites = 0;
    await installApiScenario(page, {
      profile: 'admin',
      queues,
      tiers,
      handlers: [
        async ({ path, method, route }) => {
          if (path.includes('/notification-rules')) {
            if (method !== 'GET') notificationWrites++;
            await route.fulfill({ json: apiEnvelope(paginated([])) });
            return true;
          }
          const list = path.match(/^\/api\/v1\/queues\/([^/]+)\/tiers$/);
          if (list && method === 'GET') {
            const queueId = list[1]!;
            await route.fulfill({
              json: apiEnvelope(
                paginated(
                  tiers
                    .filter((tier) => active.get(queueId)?.has(tier.tierId))
                    .map((tier, index) => ({
                      queueId,
                      tierId: tier.tierId,
                      tier,
                      price: 0,
                      currency: 'TND',
                      currencyOverride: null,
                      isDefault: defaults.get(queueId) === tier.tierId,
                      displayOrder: index + 1,
                      isActive: true,
                    })),
                ),
              ),
            });
            return true;
          }
          const item = path.match(/^\/api\/v1\/queues\/([^/]+)\/tiers\/([^/]+)$/);
          if (item && method === 'PATCH') {
            const queueId = item[1]!,
              tierId = item[2]!,
              body = route.request().postDataJSON();
            patches.push({ queueId, tierId, body });
            if (body.isDefault === true) defaults.set(queueId, tierId);
            else if (body.isDefault === false && defaults.get(queueId) === tierId)
              defaults.set(queueId, '');
            await route.fulfill({ json: apiEnvelope({}) });
            return true;
          }
          if (item && method === 'DELETE') {
            active.get(item[1]!)?.delete(item[2]!);
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
    await expect(panel.getByRole('button', { name: 'Activer Express', exact: true })).toBeEnabled();
    await panel.getByRole('combobox').first().selectOption(queues[1]!.queueId);
    const defaultSelect = panel.locator('.queue-default-service select');
    await expect(defaultSelect).toHaveValue(tiers[1]!.tierId);
    await defaultSelect.selectOption(tiers[0]!.tierId);
    await expect(defaultSelect).toBeEnabled();
    expect(patches[0]).toMatchObject({
      queueId: queues[1]!.queueId,
      tierId: tiers[0]!.tierId,
      body: { isDefault: true },
    });
    expect(Object.keys(patches[0]!.body)).toEqual(['isDefault']);
    expect(notificationWrites).toBe(0);
    await defaultSelect.selectOption('');
    await expect(defaultSelect).toBeEnabled();
    expect(patches[1]!.body).toEqual({ isDefault: false });
    await expect(defaultSelect).toHaveValue('');
    const free = panel.locator('.tier-config-card').first();
    await expect(free.getByRole('button', { name: /sactiver Gratuit$/i })).toBeDisabled();
    await free.locator('summary').click();
    await free.getByRole('spinbutton').fill('12.5');
    await free.getByRole('button', { name: /^enregistrer$/i }).click();
    await expect.poll(() => patches.length).toBe(3);
    expect(patches[2]!.body).toEqual({ price: 12.5, currency: null });
    expect(notificationWrites).toBe(0);
    await expect(defaultSelect).toHaveValue('');
    await panel.getByRole('button', { name: /sactiver Premium$/i }).click();
    await expect(panel.getByRole('button', { name: 'Activer Premium', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: 'test-results/services-' + width + '.png', fullPage: true });
  });
}
