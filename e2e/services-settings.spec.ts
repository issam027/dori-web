import { expect, test } from '@playwright/test';
import {
  apiEnvelope,
  paginated,
  buildQueue,
  installApiScenario,
} from './support/scenario-fixtures';

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Expected test fixture value');
  return value;
}

for (const width of [320, 390, 768, 1024, 1440]) {
  test('default is optional and independent of options at ' + String(width), async ({ page }) => {
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
    queues.push(
      buildQueue({ queueId: '00000000-0000-4000-8000-000000000012', queueName: 'Troisième' }),
      buildQueue({ queueId: '00000000-0000-4000-8000-000000000013', queueName: 'Quatrième' }),
    );
    const getRequests: string[] = [];
    const tiers = ['Basic', 'Premium', 'Express'].map((tierName, index) => ({
      tierId: '00000000-0000-4000-8000-00000000000' + String(index + 1),
      tierName,
      tierCode: tierName,
      description: 'Service ' + tierName,
      isActive: true,
      isSystem: index === 0,
    }));
    const defaults = new Map(queues.map((queue) => [queue.queueId, required(tiers[1]).tierId]));
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
          if (method === 'GET') getRequests.push(path);
          if (path.includes('/notification-rules')) {
            if (method !== 'GET') notificationWrites++;
            await route.fulfill({ json: apiEnvelope(paginated([])) });
            return true;
          }
          const list = path.match(/^\/api\/v1\/queues\/([^/]+)\/tiers$/);
          if (list && method === 'GET') {
            const queueId = required(list[1]);
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
            const queueId = required(item[1]),
              tierId = required(item[2]),
              body = route.request().postDataJSON() as Record<string, unknown>;
            patches.push({ queueId, tierId, body });
            if (body.isDefault === true) defaults.set(queueId, tierId);
            else if (body.isDefault === false && defaults.get(queueId) === tierId)
              defaults.set(queueId, '');
            await route.fulfill({ json: apiEnvelope({}) });
            return true;
          }
          if (item && method === 'DELETE') {
            active.get(required(item[1]))?.delete(required(item[2]));
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
    expect(
      getRequests.filter((path) => /^\/api\/v1\/queues\/[^/]+\/tiers$/.test(path)),
    ).toHaveLength(1);
    expect(getRequests.filter((path) => path.includes('/notification-rules'))).toHaveLength(0);
    await expect(panel.getByRole('button', { name: 'Activer Express', exact: true })).toBeEnabled();
    await panel.getByRole('combobox').first().selectOption(required(queues[1]).queueId);
    const defaultSelect = panel.locator('.queue-default-service select');
    await expect(defaultSelect).toHaveValue(required(tiers[1]).tierId);
    const makeFreeDefault = panel.getByRole('button', {
      name: 'Définir Basic comme service par défaut',
      exact: true,
    });
    await expect(makeFreeDefault).toBeVisible();
    await expect(
      panel.getByRole('button', { name: 'Définir Express comme service par défaut', exact: true }),
    ).toHaveCount(0);
    const free = panel.locator('.tier-config-card').first();
    await free.locator('summary').click();
    await free.getByRole('spinbutton').fill('12.5');
    await makeFreeDefault.click();
    await expect(defaultSelect).toHaveValue(required(tiers[0]).tierId);
    await expect(makeFreeDefault).toHaveCount(0);
    await expect(free.getByRole('spinbutton')).toHaveValue('12.5');
    await expect(defaultSelect).toBeEnabled();
    expect(patches[0]).toMatchObject({
      queueId: required(queues[1]).queueId,
      tierId: required(tiers[0]).tierId,
      body: { isDefault: true },
    });
    expect(Object.keys(required(patches[0]).body)).toEqual(['isDefault']);
    expect(notificationWrites).toBe(0);
    await defaultSelect.selectOption('');
    await expect(defaultSelect).toBeEnabled();
    expect(required(patches[1]).body).toEqual({ isDefault: false });
    await expect(defaultSelect).toHaveValue('');
    await expect(
      panel.getByRole('button', { name: 'Définir Basic comme service par défaut', exact: true }),
    ).toBeVisible();
    await expect(free.getByRole('button', { name: /sactiver Basic$/i })).toBeDisabled();
    await free.getByRole('spinbutton').fill('12.5');
    await free.getByRole('button', { name: /^enregistrer$/i }).click();
    await expect.poll(() => patches.length).toBe(3);
    expect(required(patches[2]).body).toEqual({ price: 12.5, currency: null });
    expect(notificationWrites).toBe(0);
    await expect(defaultSelect).toHaveValue('');
    await panel.getByRole('button', { name: /sactiver Premium$/i }).click();
    await expect(panel.getByRole('button', { name: 'Activer Premium', exact: true })).toBeVisible();
    await expect(
      panel.getByRole('button', { name: 'Définir Premium comme service par défaut', exact: true }),
    ).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: 'test-results/services-' + String(width) + '.png',
      fullPage: true,
    });
  });
}
