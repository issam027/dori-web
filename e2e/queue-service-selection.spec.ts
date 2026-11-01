import { expect, test, type Page } from '@playwright/test';
import {
  apiEnvelope,
  paginated,
  buildQueue,
  installApiScenario,
  useFixedClock,
} from './support/scenario-fixtures';

const queueId = '00000000-0000-4000-8000-000000000010';
const freeId = '00000000-0000-4000-8000-000000000001';
const premiumId = '00000000-0000-4000-8000-000000000002';
async function scenario(page: Page, mode: 'sole' | 'default' | 'none', kiosk = false) {
  await useFixedClock(page, '2026-10-09T08:15:00Z');
  const tiers = [
    { tierId: freeId, tierName: 'Basic', tierCode: 'free', isActive: true },
    { tierId: premiumId, tierName: 'Premium', tierCode: 'premium', isActive: true },
  ];
  await installApiScenario(page, {
    profile: kiosk ? 'kiosk' : 'operator',
    queues: [buildQueue({ queueId, currency: 'TND' })],
    tiers,
    handlers: [
      async ({ path, url, route }) => {
        if (path === '/api/v1/queues/' + queueId + '/tiers') {
          await route.fulfill({
            json: apiEnvelope(
              paginated(
                tiers.map((tier, index) => ({
                  queueId,
                  tierId: tier.tierId,
                  tier,
                  price: index * 10,
                  currency: 'TND',
                  currencyOverride: null,
                  displayOrder: index + 1,
                  isActive: mode !== 'sole' || index === 0,
                  isDefault: mode === 'default' && index === 1,
                })),
              ),
            ),
          });
          return true;
        }
        if (path.endsWith('/availability')) {
          const date = url.searchParams.get('dateFrom') ?? '2026-10-09';
          await route.fulfill({
            json: apiEnvelope({
              queueId,
              timezone: 'Africa/Tunis',
              dateFrom: date,
              dateTo: date,
              days: [
                {
                  businessDate: date,
                  isOpen: true,
                  capacity: 10,
                  booked: 0,
                  available: 10,
                  slots: [
                    { time: '09:00', capacity: 10, booked: 0, available: 10, isAvailable: true },
                  ],
                },
              ],
            }),
          });
          return true;
        }
        return false;
      },
    ],
  });
}
async function person(page: Page) {
  await page.getByRole('button', { name: /nouvelle personne/i }).click();
  await page.getByRole('textbox', { name: /^nom/i }).fill('Test');
  await page.getByRole('textbox', { name: /phone/i }).fill('+33612345678');
}
for (const mode of ['sole', 'default', 'none'] as const) {
  for (const screen of ['quick', 'appointment'] as const) {
    test(screen + ' respects queue services with ' + mode, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await scenario(page, mode);
      if (screen === 'quick') {
        await page.goto('/desk');
        await page.getByRole('button', { name: /cr.er un ticket/i }).click();
        await person(page);
        await page.getByRole('button', { name: /continuer vers le ticket/i }).click();
      } else {
        await page.goto('/appointments');
        await page.getByRole('button', { name: /nouveau rendez-vous/i }).click();
        await person(page);
        await page.getByRole('button', { name: /^continuer/i }).click();
      }
      const selector = page.getByLabel(/forfait/i);
      if (mode === 'sole') await expect(selector).toHaveCount(0);
      else {
        await expect(selector).toHaveValue(mode === 'default' ? premiumId : '');
        if (mode === 'default')
          await expect(selector.locator('option:checked')).toContainText(/service par d.faut/i);
        else {
          const submit = page.getByRole('dialog').getByRole('button', {
            name: screen === 'quick' ? /cr.er le ticket/i : /cr.er le rendez-vous/i,
          });
          await expect(submit).toBeDisabled();
        }
        await selector.selectOption(freeId);
        await expect(selector).toHaveValue(freeId);
      }
    });
  }
  test('kiosk respects queue services with ' + mode, async ({ page }) => {
    await scenario(page, mode, true);
    await page.goto('/kiosk');
    await page.locator('.kiosk-choices button').first().click();
    await page.locator('.kiosk-tiles button').first().click();
    await page.locator('.kiosk-actions .primary').click();
    await page.locator('input[autocomplete="family-name"]').fill('Test');
    await page.getByRole('button', { name: /indicatif pays/i }).click();
    await page.getByRole('option', { name: '+216', exact: true }).click();
    await page.getByRole('textbox', { name: /phone/i }).fill('20123456');
    await page.locator('.kiosk-actions .primary').click();
    if (mode === 'sole') {
      await expect(page.locator('.kiosk-review')).toBeVisible();
      await expect(page.locator('.kiosk-tier-tiles')).toHaveCount(0);
      await page.locator('.kiosk-actions button').first().click();
      await expect(page.locator('input[autocomplete="family-name"]')).toBeVisible();
    } else {
      const tiles = page.locator('.kiosk-tier-tiles');
      await expect(tiles.locator('button')).toHaveCount(2);
      await expect(tiles.locator('button[aria-pressed="true"]')).toHaveCount(
        mode === 'default' ? 1 : 0,
      );
      if (mode === 'default')
        await expect(tiles.locator('button[aria-pressed="true"]')).toContainText('Premium');
      else await expect(page.locator('.kiosk-actions .primary')).toBeDisabled();
    }
  });
}

test('onboarding saves no default even when queue creation supplied a free default', async ({
  page,
}) => {
  const tiers = [
    { tierId: freeId, tierName: 'Basic', tierCode: 'free', isActive: true },
    { tierId: premiumId, tierName: 'Premium', tierCode: 'premium', isActive: true },
  ];
  const patches: Record<string, unknown>[] = [];
  const associations: Record<string, unknown>[] = [];
  await installApiScenario(page, {
    profile: 'root',
    queues: [buildQueue()],
    tiers,
    handlers: [
      async ({ path, method, route }) => {
        if (path === '/api/v1/queues/' + queueId + '/tiers' && method === 'GET') {
          await route.fulfill({
            json: apiEnvelope(
              paginated([{ queueId, tierId: freeId, isActive: true, isDefault: true }]),
            ),
          });
          return true;
        }
        if (path === '/api/v1/queues/' + queueId + '/tiers' && method === 'POST') {
          associations.push(route.request().postDataJSON());
          await route.fulfill({ json: apiEnvelope({}) });
          return true;
        }
        if (path === '/api/v1/queues/' + queueId + '/tiers/' + freeId && method === 'PATCH') {
          patches.push(route.request().postDataJSON());
          await route.fulfill({ json: apiEnvelope({}) });
          return true;
        }
        return false;
      },
    ],
  });
  await page.addInitScript(
    ({ queueId, premiumId }) =>
      localStorage.setItem(
        'dori:onboarding:v3',
        JSON.stringify({
          draftVersion: 3,
          step: 4,
          site: { siteName: 'Nouveau site', timezone: 'Africa/Tunis' },
          confirmedSiteId: '00000000-0000-4000-8000-000000000001',
          queues: [],
          confirmedQueueIds: { ACC: queueId },
          selectedTierIds: { [queueId]: [premiumId] },
          tierConfigurations: {
            [queueId]: {
              [premiumId]: {
                price: 0,
                currency: '',
                displayOrder: 1,
                isDefault: false,
                welcomeSms: false,
                welcomeEmail: false,
                alertSms: false,
                alertThresholdType: 'position',
                alertPosition: 3,
                includeTrackingLink: false,
              },
            },
          },
          associatedTierQueueIds: [],
          completedUserIds: [],
          testValidated: false,
        }),
      ),
    { queueId, premiumId },
  );
  await page.goto('/onboarding');
  await expect(page.locator('.queue-default-service select')).toHaveValue('');
  await page.locator('.setup-actions .button-primary').click();
  await expect.poll(() => associations.length).toBe(1);
  expect(associations[0]).toMatchObject({ tierId: premiumId, isDefault: false });
  await expect.poll(() => patches.length).toBe(1);
  expect(patches[0]).toEqual({ isDefault: false });
});
