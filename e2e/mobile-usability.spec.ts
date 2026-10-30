/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test';
import {
  apiEnvelope,
  buildAppointment,
  buildMonitoringSeries,
  buildPerson,
  buildQueue,
  buildRegistration,
  buildSite,
  installApiScenario,
  paginated,
} from './support/scenario-fixtures';

const site = buildSite();
const queue = buildQueue();
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

async function fits(page: Page) {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
    .toBeLessThanOrEqual(0);
}

for (const width of [320, 390, 430]) {
  test(`mobile lists, filters, navigation and forms fit ${String(width)}px`, async ({ page }) => {
    await installApiScenario(page, {
      sites: [site],
      queues: [queue],
      handlers: [
        async ({ path, route }) => {
          if (path === '/api/v1/persons') {
            await route.fulfill({
              json: apiEnvelope(
                paginated([
                  buildPerson({
                    isActive: true,
                    firstName: 'Alexandrine-Marie',
                    lastName: 'Ben Abdallah Dupont',
                    email: 'alexandrine.marie.benabdallah@example.com',
                  }),
                ]),
              ),
            });
            return true;
          }
          if (path === '/api/v1/registrations') {
            await route.fulfill({
              json: apiEnvelope(
                paginated([
                  buildRegistration({
                    firstName: 'Alexandrine-Marie',
                    lastName: 'Ben Abdallah Dupont',
                    queueName: 'Accueil des consultations et examens spécialisés',
                  }),
                ]),
              ),
            });
            return true;
          }
          return false;
        },
      ],
    });
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/my-queues');
    await expect(page.locator('.queue-registration-mobile-card')).toBeVisible();
    await expect(page.getByRole('searchbox')).toBeVisible();
    await fits(page);
    await page.locator('.admin-filter-card summary').click();
    await expect(page.getByLabel('Date', { exact: true })).toBeVisible();
    await fits(page);
    await page.goto('/persons');
    await expect(page.locator('.person-mobile-card')).toBeVisible();
    await expect(page.getByRole('searchbox')).toBeVisible();
    await fits(page);
    await page.getByRole('button', { name: 'Nouvelle personne', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Enregistrer', exact: true })).toBeVisible();
    await expect.poll(async () => Math.round((await dialog.boundingBox())?.width ?? 0)).toBe(width);
    for (const button of await dialog.locator('.dialog-actions button').all()) {
      const bounds = await button.boundingBox();
      expect(bounds).not.toBeNull();
      if (!bounds) throw new Error('Missing action button');
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      expect(Math.round(bounds.height)).toBeGreaterThanOrEqual(44);
    }
    await page.setViewportSize({ width, height: 480 });
    await expect
      .poll(async () => {
        const bounds = await dialog.locator('.dialog-actions').boundingBox();
        return bounds ? Math.round(bounds.y + bounds.height) : Infinity;
      })
      .toBeLessThanOrEqual(480);
    await page.keyboard.press('Escape');
    await page
      .getByRole('navigation', { name: 'Navigation rapide' })
      .getByRole('button', { name: 'Plus' })
      .click();
    await expect(page.getByRole('dialog', { name: 'Navigation principale' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.sidebar')).not.toHaveClass(/is-mobile-open/);
  });
}

test('mobile agenda changes day and creates an appointment without horizontal scrolling', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-09T10:00:00Z') });
  await installApiScenario(page, {
    sites: [site],
    queues: [queue],
    handlers: [
      async ({ path, route }) => {
        if (path.endsWith('/availability')) {
          await route.fulfill({ json: apiEnvelope({ timezone: 'Europe/Paris', days: [] }) });
          return true;
        }
        if (path === '/api/v1/registrations') {
          await route.fulfill({
            json: apiEnvelope(
              paginated([
                buildAppointment({
                  scheduledTime: '2026-10-09T09:00:00Z',
                  businessDate: '2026-10-09',
                }),
              ]),
            ),
          });
          return true;
        }
        return false;
      },
    ],
  });
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/appointments');
  await expect(page.locator('.agenda-item')).toBeVisible();
  await fits(page);
  await expect(page.locator('.agenda-days button[aria-pressed="true"]')).toContainText('09');
  await page.locator('.agenda-days button').first().click();
  await expect(page.locator('.agenda-date-controls input')).toHaveValue('2026-10-05');
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('.mobile-agenda')).toBeVisible();
  await expect(page.locator('.mobile-bottom-nav')).toBeVisible();
  await expect(page.locator('.agenda-date-controls input')).toHaveValue('2026-10-05');
  await fits(page);
  await page.getByRole('button', { name: 'Nouveau rendez-vous' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('mobile navigation and agenda fit Arabic RTL in all themes', async ({ page }) => {
  await installApiScenario(page, {
    sites: [site],
    queues: [queue],
    userOverrides: { languagePreference: 'ar' },
  });
  await page.setViewportSize({ width: 320, height: 700 });
  await page.addInitScript(() => {
    localStorage.setItem(
      'dori-preferences',
      JSON.stringify({
        state: { theme: 'light', locale: 'ar', accentColor: 'lagoon' },
        version: 0,
      }),
    );
  });
  for (const theme of ['light', 'soft-light', 'soft-dark', 'dark']) {
    await page.goto('/appointments');
    await expect(page.locator('.mobile-agenda')).toBeVisible();
    await page.evaluate((value) => {
      document.documentElement.dataset.theme = value;
    }, theme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await fits(page);
    await page.locator('.mobile-bottom-nav button').click();
    await expect(page.locator('.sidebar')).toHaveClass(/is-mobile-open/);
    await expect
      .poll(async () => {
        const bounds = await page.locator('.sidebar').boundingBox();
        return bounds ? Math.round(bounds.x + bounds.width) : 0;
      })
      .toBe(320);
    await page.keyboard.press('Escape');
  }
});

test('mobile reports show readable charts and cards with advanced details collapsed', async ({
  page,
}) => {
  const metrics = {
    registered: 20,
    served: 15,
    noShow: 1,
    cancelled: 0,
    averageWaitMinutes: 12,
    averageServiceMinutes: 6,
  };
  await installApiScenario(page, {
    sites: [site],
    queues: [queue],
    handlers: [
      async ({ path, route }) => {
        if (path !== '/api/v1/monitoring/series') return false;
        await route.fulfill({
          json: apiEnvelope(
            buildMonitoringSeries({
              totals: metrics,
              series: [{ ...metrics, periodStart: '2026-10-09T00:00:00Z' }],
              breakdowns: {
                byQueue: [{ ...metrics, queueId: queue.queueId, queueName: queue.queueName }],
                byEntryType: [{ entryType: 'walkin', count: 20 }],
                byUser: [],
                byTier: [],
                byStatus: [],
              },
            }),
          ),
        });
        return true;
      },
    ],
  });
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/reports');
  await expect(page.locator('.report-visual-panel')).toBeVisible();
  await expect(page.getByLabel('Mesure du graphique')).toBeVisible();
  await expect(page.locator('.report-advanced')).not.toHaveAttribute('open');
  await expect(page.locator('.reports-page > .metric-grid > .metric-card')).toHaveCount(3);
  await expect(
    page.locator('.reports-page > .card .responsive-data-table-mobile .data-table-mobile-card'),
  ).toBeVisible();
  await fits(page);
  expect(
    await page.locator('.report-chart-canvas').evaluate((e) => e.scrollWidth <= e.clientWidth),
  ).toBe(true);
  await page.locator('.report-advanced > summary').click();
  await fits(page);
  expect(
    await page
      .locator('main')
      .evaluate((main) =>
        [...main.querySelectorAll('*')]
          .filter(
            (element) =>
              element.getBoundingClientRect().width > 0 &&
              element.scrollWidth > element.clientWidth + 1 &&
              ['auto', 'scroll'].includes(getComputedStyle(element).overflowX),
          )
          .map((element) => element.className),
      ),
  ).toEqual([]);
  await page.screenshot({
    path: 'specifications/audits/mobile-after/reports-populated-320.png',
    fullPage: true,
    animations: 'disabled',
  });
});

test('collapsed cockpit queues preserve the active ticket and its actions', async ({ page }) => {
  await installApiScenario(page, {
    sites: [site],
    queues: [queue],
    handlers: [
      async ({ path, route }) => {
        if (!path.endsWith('/cockpit')) return false;
        await route.fulfill({
          json: apiEnvelope({
            siteId: site.siteId,
            siteName: site.siteName,
            serverTime: '2026-10-09T10:00:00Z',
            operator: { userId: 'operator', username: 'operator' },
            recentPassages: [],
            queues: [
              {
                queueId: queue.queueId,
                queueCode: queue.queueCode,
                queueName: queue.queueName,
                waitingCount: 4,
                remainingAppointmentsCount: 0,
                estimatedWaitMinutes: 12,
                threadCount: 1,
                occupiedThreadsCount: 1,
                availableThreadNumbers: [],
                sessions: [],
                currentOperatorSessionId: null,
                sessionOpening: {
                  allowed: false,
                  availableThreadNumbers: [],
                  replaceableSessions: [],
                  requiresReplacement: false,
                },
                centralizedNext: { eligible: false, unavailableReason: 'active_call_in_progress' },
                nextCandidates: [],
                activeCall: {
                  registrationId: 'registration-1',
                  ticketNumber: 'A042',
                  status: 'in_progress',
                  calledAt: '2026-10-09T09:59:00Z',
                  entryType: 'walkin',
                  notesCount: 0,
                  person: { personId: 'person-1', firstName: 'Alexandrine', lastName: 'Dupont' },
                  tier: { tierId: 'tier-1', tierName: 'Standard' },
                },
              },
            ],
          }),
        });
        return true;
      },
    ],
  });
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/desk');
  await page.locator('.cockpit-filter-preferences > summary').click();
  await expect(page.getByRole('combobox', { name: 'Trier les files' })).toBeVisible();
  const card = page.locator('.cockpit-queue-card');
  await card.getByRole('button', { name: 'Réduire la file' }).click();
  await expect(card.locator('.cockpit-collapsed-summary')).toContainText('A042');
  await expect(card.locator('.cockpit-call-actions')).toBeVisible();
  await expect(card.getByRole('button', { name: 'Servi', exact: true })).toBeVisible();
  await fits(page);
  await page.getByRole('button', { name: 'Résumé', exact: true }).click();
  await expect(page.locator('.cockpit-metrics')).toBeVisible();
  await expect(card).toBeHidden();
  await page.getByRole('button', { name: 'Travail', exact: true }).click();
  await expect(card.locator('.cockpit-call-actions')).toBeVisible();
});

test('resending a notification requires confirmation and cancellation sends nothing', async ({
  page,
}) => {
  let sent = 0;
  const notificationId = '00000000-0000-4000-8000-000000000003';
  await installApiScenario(page, {
    sites: [site],
    queues: [queue],
    handlers: [
      async ({ path, route }) => {
        if (path.endsWith('/resend')) {
          sent += 1;
          await route.fulfill({ json: apiEnvelope({ notificationId }) });
          return true;
        }
        if (path === '/api/v1/notifications') {
          await route.fulfill({
            json: apiEnvelope(
              paginated([
                {
                  notificationId,
                  registrationId: 'registration-1',
                  ticketNumber: 'A042',
                  channel: 'sms',
                  notificationType: 'manual',
                  locale: 'fr',
                  recipient: '+33612345678',
                  notificationContent: 'Votre passage approche',
                  notificationStatus: 'failed',
                  attemptCount: 1,
                  createdAt: '2026-10-09T10:00:00Z',
                  updatedAt: '2026-10-09T10:00:00Z',
                },
              ]),
            ),
          });
          return true;
        }
        return false;
      },
    ],
  });
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/notifications');
  const resend = page
    .locator('.data-table-mobile-card')
    .getByRole('button', { name: 'Réémettre', exact: true });
  await resend.click();
  const confirmation = page.getByRole('dialog');
  await expect(confirmation).toBeVisible();
  expect(sent).toBe(0);
  await confirmation.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(confirmation).toBeHidden();
  expect(sent).toBe(0);
  await resend.click();
  await confirmation.getByRole('button', { name: 'Réémettre', exact: true }).click();
  await expect.poll(() => sent).toBe(1);
  await expect(confirmation).toBeHidden();
});
