import { expect, test, type Page } from '@playwright/test';
import {
  apiEnvelope,
  apiFailure,
  buildQueue,
  installApiScenario,
  paginated,
} from './support/scenario-fixtures';

async function installExperienceScenario(page: Page) {
  const queues = [
    buildQueue({ queueId: 10, queueName: 'Accueil général' }),
    buildQueue({ queueId: 11, queueCode: 'DOC', queueName: 'Documents' }),
  ];
  await installApiScenario(page, {
    profile: 'kiosk',
    queues,
    handlers: [
      async ({ path, method, route }) => {
        const tierMatch = /^\/api\/v1\/queues\/(10|11)\/tiers$/.exec(path);
        if (tierMatch) {
          await route.fulfill({
            json: apiEnvelope(
              paginated([
                {
                  queueId: Number(tierMatch[1]),
                  tierId: 1,
                  price: 4.5,
                  currency: 'EUR',
                  currencyOrigin: 'queue',
                  isActive: true,
                  isDefault: true,
                  displayOrder: 1,
                  tier: { tierId: 1, tierCode: 'STD', tierName: 'Standard', isActive: true },
                },
              ]),
            ),
          });
          return true;
        }
        if (/\/notification-rules$/.test(path)) {
          await route.fulfill({
            json: apiEnvelope(
              paginated([
                {
                  ruleId: 1,
                  channel: 'sms',
                  notificationType: 'welcome',
                  includeTrackingLink: true,
                  isActive: true,
                },
                {
                  ruleId: 2,
                  channel: 'sms',
                  notificationType: 'threshold',
                  includeTrackingLink: true,
                  isActive: true,
                },
              ]),
            ),
          });
          return true;
        }
        if (path === '/api/v1/registrations' && method === 'POST') {
          await route.fulfill({
            json: apiEnvelope({
              registrationId: 700,
              ticketNumber: 'A700',
              trackingUrl: 'https://api.example/track?token=opaque-kiosk-token',
            }),
          });
          return true;
        }
        const displayMatch = /^\/api\/v1\/queues\/(10|11)\/display$/.exec(path);
        if (displayMatch) {
          const second = displayMatch[1] === '11';
          await route.fulfill({
            json: apiEnvelope({
              queueId: second ? 11 : 10,
              queueName: second ? 'Documents' : 'Accueil général',
              activeThreads: [
                {
                  threadNumber: second ? 4 : 2,
                  currentTicket: second ? 'D021' : 'A014',
                  calledAt: second ? '2026-10-10T10:01:00Z' : '2026-10-10T10:00:00Z',
                },
              ],
              nextTickets: second ? ['D022'] : ['A015', 'A016'],
            }),
          });
          return true;
        }
        return false;
      },
    ],
  });
}

test('kiosk completes the walk-in journey and purges personal data', async ({ page }) => {
  await page.setViewportSize({ width: 1180, height: 820 });
  await installExperienceScenario(page);
  await page.goto('/kiosk');
  await page.getByRole('button', { name: /sans rendez-vous/i }).click();
  await page.getByRole('button', { name: /accueil général/i }).click();
  await page.getByRole('button', { name: /continuer/i }).click();
  await page.getByLabel(/nom de famille/i).fill('Martin');
  await page.getByLabel(/prénom/i).fill('Lina');
  await page.getByLabel(/email/i).fill('lina.martin@example.test');
  await page.getByLabel(/indicatif pays/i).selectOption('+216');
  await page.getByPlaceholder(/6 12 34 56 78/i).fill('20 123 456');
  await expect(page.getByText(/\+21620123456/)).toBeVisible();
  await page.getByRole('button', { name: /continuer/i }).click();
  const tier = page.getByRole('button', { name: /standard/i });
  await expect(tier).toContainText(/SMS.*inclus/i);
  await expect(tier).toContainText(/Lien de suivi.*inclus/i);
  await tier.click();
  await page.getByRole('button', { name: /continuer/i }).click();
  await expect(page.locator('.kiosk-review')).toContainText('Lina');
  await expect(page.locator('.kiosk-review')).toContainText('lina.martin@example.test');
  await expect(page.locator('.kiosk-review')).toContainText('+21620123456');
  expect(
    await page.evaluate<string>(
      "getComputedStyle(document.querySelector('.kiosk-review tbody')).gridTemplateColumns",
    ),
  ).toMatch(/\S+\s+\S+/);
  await page.getByRole('button', { name: /créer mon ticket/i }).click();
  await expect(page.getByText('A700')).toBeVisible();
  await expect(page.getByAltText(/QR code/i)).toHaveAttribute('src', /^data:image\/png/);
  expect(
    await page.evaluate<boolean>(
      "document.querySelector('.kiosk-screen').scrollHeight <= document.querySelector('.kiosk-screen').clientHeight",
    ),
  ).toBe(true);
  await page.getByRole('button', { name: /terminer/i }).click();
  await expect(page.getByRole('heading', { name: /comment pouvons-nous/i })).toBeVisible();
  await page.getByRole('button', { name: /sans rendez-vous/i }).click();
  await page.getByRole('button', { name: /accueil général/i }).click();
  await page.getByRole('button', { name: /continuer/i }).click();
  await expect(page.getByLabel(/nom de famille/i)).toHaveValue('');
  await expect(page.getByLabel(/email/i)).toHaveValue('');
});

test('kiosk inactivity timeout returns home and erases the draft', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-10T10:00:00Z') });
  await installExperienceScenario(page);
  await page.goto('/kiosk');
  await page.getByRole('button', { name: /sans rendez-vous/i }).click();
  await page.getByRole('button', { name: /accueil général/i }).click();
  await page.getByRole('button', { name: /continuer/i }).click();
  await page.getByLabel(/nom de famille/i).fill('À effacer');
  await page.clock.runFor(31_000);
  await expect(page.getByRole('heading', { name: /comment pouvons-nous/i })).toBeVisible();
  await page.getByRole('button', { name: /sans rendez-vous/i }).click();
  await page.getByRole('button', { name: /accueil général/i }).click();
  await page.getByRole('button', { name: /continuer/i }).click();
  await expect(page.getByLabel(/nom de famille/i)).toHaveValue('');
});

test('room display combines every scoped queue without exposing PII at 1080p and 4K', async ({
  page,
}) => {
  await installExperienceScenario(page);
  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 3840, height: 2160 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/display');
    await expect(page.getByText('A014')).toBeVisible();
    await expect(page.getByText('D021')).toBeVisible();
    await expect(page.getByText('A015')).toBeVisible();
    await expect(page.getByText('D022')).toBeVisible();
    await expect(page.getByText(/guichet 2/i)).toBeVisible();
    await expect(page.getByText(/guichet 4/i)).toBeVisible();
    expect(
      await page.evaluate<boolean>(
        'document.documentElement.scrollWidth <= document.documentElement.clientWidth && document.documentElement.scrollHeight <= document.documentElement.clientHeight',
      ),
    ).toBe(true);
    await expect(page.locator('body')).not.toContainText(/Martin|lina\.martin|\+216/i);
  }
});

test('real tracking consumes its opaque token without exposing a test field', async ({ page }) => {
  let receivedToken = '';
  await installApiScenario(page, {
    profile: 'kiosk',
    handlers: [
      async ({ path, route }) => {
        if (path !== '/api/v1/public/registrations/position') return false;
        receivedToken = (await route.request().allHeaders())['x-registration-token'] ?? '';
        await route.fulfill({
          json: apiEnvelope({
            ticketNumber: 'A014',
            position: 2,
            estimatedWaitMinutes: 8,
            status: 'waiting',
            queueName: 'Accueil général',
          }),
        });
        return true;
      },
    ],
  });
  await page.goto('/track?token=opaque-real-token');
  await expect(page).toHaveURL(/\/track$/);
  await expect(page.getByText('A014')).toBeVisible();
  expect(receivedToken).toBe('opaque-real-token');
  await expect(page.getByLabel(/tracking id/i)).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('opaque-real-token');
});

for (const scenario of [
  { status: 404, code: 'TRACKING_INVALID', title: /lien de suivi invalide/i },
  { status: 410, code: 'TRACKING_EXPIRED', title: /lien de suivi expiré/i },
  { status: 503, code: 'SERVICE_UNAVAILABLE', title: /suivi momentanément indisponible/i },
]) {
  test(`tracking presents a controlled ${scenario.code} state`, async ({ page }) => {
    await installApiScenario(page, {
      profile: 'kiosk',
      handlers: [
        async ({ path, route }) => {
          if (path !== '/api/v1/public/registrations/position') return false;
          await route.fulfill(apiFailure(scenario.status, scenario.code));
          return true;
        },
      ],
    });
    await page.goto(`/track?token=${scenario.code.toLowerCase()}`);
    await expect(page).toHaveURL(/\/track$/);
    await expect(
      page.getByRole('alert').getByRole('heading', { name: scenario.title }),
    ).toBeVisible();
    await expect(page.getByLabel(/tracking id/i)).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText(scenario.code.toLowerCase());
  });
}
