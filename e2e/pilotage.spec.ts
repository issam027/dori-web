import { expect, test, type Page } from '@playwright/test';
import {
  apiEnvelope,
  apiFailure,
  buildPerson,
  buildQueue,
  buildRegistration,
  buildSite,
  installApiScenario,
  paginated,
} from './support/scenario-fixtures';

const dailyReport = (queueId: number, queueName: string, date: string) => ({
  queueId,
  queueCode: queueId === 10 ? 'ACC' : 'DOC',
  queueName,
  siteName: 'Site E2E Alpha',
  businessDate: date,
  volume: {
    totalRegistered: queueId === 10 ? 10 : 5,
    totalWalkin: 12,
    totalAppointment: 3,
    totalServed: queueId === 10 ? 8 : 4,
    totalNoShow: 1,
    totalExpired: 0,
    totalCancelled: 0,
    totalOpen: 2,
  },
  kpis: { noShowRate: 0.1, averageWaitMinutes: 12, averageServiceMinutes: 6 },
});

test('supervision renders operational cards, refreshes them and handles an empty scope', async ({
  page,
}) => {
  let loadCalls = 0;
  await installApiScenario(page, {
    profile: 'manager',
    handlers: [
      async ({ path, route }) => {
        if (path === '/api/v1/reports/dashboard/summary') {
          await route.fulfill({
            json: apiEnvelope({
              activeSites: 1,
              activeQueues: 2,
              waitingTotal: loadCalls ? 9 : 7,
              waitingWalkin: 5,
              waitingAppointment: 2,
              appointmentsToday: 3,
            }),
          });
          return true;
        }
        if (path === '/api/v1/reports/dashboard/queue-load') {
          loadCalls += 1;
          await route.fulfill({
            json: apiEnvelope([
              {
                queueId: 10,
                queueCode: 'ACC',
                queueName: 'Accueil général',
                siteId: 1,
                siteName: 'Site E2E Alpha',
                queueType: 'hybrid',
                waitingCount: 7,
                dominantTier: 'Standard',
              },
            ]),
          });
          return true;
        }
        return false;
      },
    ],
  });
  await page.goto('/control-room');
  await expect(page.getByRole('heading', { name: /supervision temps réel/i })).toBeVisible();
  await expect(page.getByText('Accueil général')).toBeVisible();
  await expect(page.getByText(/7.*en attente/i)).toBeVisible();
  const callsBeforeRefresh = loadCalls;
  await page.getByRole('button', { name: /actualiser/i }).click();
  await expect.poll(() => loadCalls).toBeGreaterThan(callsBeforeRefresh);

  await page.route('**/api/v1/reports/dashboard/queue-load**', async (route) => {
    await route.fulfill({ json: apiEnvelope([]) });
  });
  await page.getByRole('button', { name: /actualiser/i }).click();
  await expect(page.getByText(/aucune file à superviser/i)).toBeVisible();
});

test('supervision exposes a recoverable error state', async ({ page }) => {
  let failing = true;
  await installApiScenario(page, {
    profile: 'manager',
    handlers: [
      async ({ path, route }) => {
        if (path !== '/api/v1/reports/dashboard/queue-load') return false;
        if (failing) {
          await route.fulfill(apiFailure(503, 'REPORTS_UNAVAILABLE'));
        } else {
          await route.fulfill({ json: apiEnvelope([]) });
        }
        return true;
      },
    ],
  });
  await page.goto('/control-room');
  await expect(page.getByText(/impossible de charger/i)).toBeVisible();
  failing = false;
  await page.getByRole('button', { name: /réessayer/i }).click();
  await expect(page.getByText(/aucune file à superviser/i)).toBeVisible();
});

test('reports apply a period of at most seven days to every queue and render an empty state', async ({
  page,
}) => {
  const requests: string[] = [];
  const queues = [
    buildQueue({ queueId: 10, queueName: 'Accueil général' }),
    buildQueue({ queueId: 11, queueName: 'Documents' }),
  ];
  await installApiScenario(page, {
    profile: 'manager',
    sites: [buildSite({ timezone: 'Europe/Paris' })],
    queues,
    handlers: [
      async ({ path, url, route }) => {
        const match = /^\/api\/v1\/reports\/queues\/(10|11)\/daily$/.exec(path);
        if (!match) return false;
        const date = url.searchParams.get('date') ?? '';
        const queueId = Number(match[1]);
        requests.push(`${String(queueId)}:${date}`);
        const queue = queues.find((item) => item.queueId === queueId);
        await route.fulfill({
          json: apiEnvelope(dailyReport(queueId, String(queue?.queueName), date)),
        });
        return true;
      },
    ],
  });
  await page.goto('/reports');
  await expect(page.getByText('Accueil général')).toBeVisible();
  await expect(page.getByText('Documents')).toBeVisible();
  const startDate = page.getByLabel(/date de début/i);
  const endDate = page.getByLabel(/date de fin/i);
  await startDate.fill('2026-09-18');
  await endDate.fill('2026-09-20');
  await expect
    .poll(() => [
      ...new Set(requests.filter((value) => /2026-09-(18|19|20)$/.test(value))),
    ].sort())
    .toEqual([
      '10:2026-09-18',
      '10:2026-09-19',
      '10:2026-09-20',
      '11:2026-09-18',
      '11:2026-09-19',
      '11:2026-09-20',
    ]);
  await expect(endDate).toHaveAttribute('max', '2026-09-24');
  await expect(page.getByRole('main').getByRole('heading', { name: /rapports/i })).toBeVisible();

  await page.route('**/api/v1/queues**', async (route) => {
    await route.fulfill({ json: apiEnvelope(paginated([])) });
  });
  await page.reload();
  await expect(page.getByText(/aucune donnée pour cette période/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /exporter csv/i })).toBeDisabled();
});

test('reports expose a recoverable API error', async ({ page }) => {
  let failing = true;
  await installApiScenario(page, {
    profile: 'manager',
    sites: [buildSite()],
    queues: [buildQueue()],
    handlers: [
      async ({ path, route }) => {
        if (path !== '/api/v1/reports/queues/10/daily') return false;
        if (failing) await route.fulfill(apiFailure(503, 'DAILY_REPORT_UNAVAILABLE'));
        else {
          await route.fulfill({
            json: apiEnvelope(dailyReport(10, 'Accueil E2E', '2026-10-10')),
          });
        }
        return true;
      },
    ],
  });
  await page.goto('/reports');
  await expect(page.getByText(/impossible de charger/i)).toBeVisible();
  failing = false;
  await page.getByRole('button', { name: /réessayer/i }).click();
  await expect(page.getByText('Accueil E2E')).toBeVisible();
});

async function installNotificationScenario(page: Page, failSend: () => boolean) {
  const person = buildPerson({
    firstName: 'Lina',
    lastName: 'Martin',
    phoneNumber: '+33612345678',
    email: undefined,
  });
  let sentBody: Record<string, unknown> | undefined;
  await installApiScenario(page, {
    profile: 'manager',
    sites: [buildSite()],
    handlers: [
      async ({ path, method, route }) => {
        if (path === '/api/v1/persons') {
          await route.fulfill({ json: apiEnvelope(paginated([person])) });
          return true;
        }
        if (path === '/api/v1/registrations') {
          await route.fulfill({
            json: apiEnvelope(
              paginated([
                buildRegistration({
                  registrationId: 700,
                  ticketNumber: 'A700',
                  businessDate: '2026-10-10',
                }),
              ]),
            ),
          });
          return true;
        }
        if (path === '/api/v1/notifications' && method === 'POST') {
          sentBody = route.request().postDataJSON() as Record<string, unknown>;
          if (failSend()) await route.fulfill(apiFailure(503, 'DELIVERY_UNAVAILABLE'));
          else await route.fulfill({ json: apiEnvelope({ notificationId: 900 }) });
          return true;
        }
        if (path === '/api/v1/notifications') {
          await route.fulfill({ json: apiEnvelope(paginated([])) });
          return true;
        }
        return false;
      },
    ],
  });
  return () => sentBody;
}

async function reachNotificationMessageStep(page: Page) {
  await page.getByRole('button', { name: /nouvel envoi/i }).click();
  await page.getByRole('button', { name: /Lina Martin/i }).click();
  await page.getByRole('button', { name: /continuer/i }).click();
  await page.getByRole('button', { name: /ticket.*A700/i }).click();
  await page.getByRole('button', { name: /rédiger le message/i }).click();
}

test('guided notification validates the recipient and confirms a successful send', async ({
  page,
}) => {
  const getSentBody = await installNotificationScenario(page, () => false);
  await page.goto('/notifications');
  await reachNotificationMessageStep(page);
  await expect(page.getByLabel(/canal/i).locator('option[value="email"]')).toHaveAttribute(
    'disabled',
    '',
  );
  await expect(page.getByText(/destinataire.*\+3.*78/i)).toBeVisible();
  await page.getByLabel(/message/i).fill('Votre passage approche.');
  await page.getByRole('button', { name: /envoyer la notification/i }).click();
  await expect(page.getByText(/notification mise en file/i)).toBeVisible();
  expect(getSentBody()).toEqual({
    registrationId: 700,
    channel: 'sms',
    content: 'Votre passage approche.',
  });
});

test('notification send failure remains inside the guided dialog', async ({ page }) => {
  await installNotificationScenario(page, () => true);
  await page.goto('/notifications');
  await reachNotificationMessageStep(page);
  await page.getByLabel(/message/i).fill('Message en échec contrôlé');
  await page.getByRole('button', { name: /envoyer la notification/i }).click();
  await expect(page.getByRole('alert')).toContainText(/n[’']a pas pu être mis en file/i);
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByLabel(/message/i)).toHaveValue('Message en échec contrôlé');
});

test('health is restricted to system_manage and renders no secret', async ({ page }) => {
  let healthCalls = 0;
  await installApiScenario(page, {
    profile: 'root',
    sites: [buildSite()],
    handlers: [
      async ({ path, route }) => {
        if (path !== '/api/v1/health') return false;
        healthCalls += 1;
        await route.fulfill({
          json: {
            status: 'ok',
            timestamp: '2026-10-10T10:00:00Z',
            uptime: 90061,
            checks: {
              database: 'up',
              memoryUsage: {
                rss: 104857600,
                heapTotal: 52428800,
                heapUsed: 31457280,
                external: 1048576,
                arrayBuffers: 524288,
              },
            },
            databaseUrl: 'postgres://secret-user:secret-password@private-host/db',
            jwtSecret: 'must-never-render',
          },
        });
        return true;
      },
    ],
  });
  await page.goto('/health');
  await expect(page.getByRole('heading', { name: /santé de la plateforme/i })).toBeVisible();
  await expect(page.getByText('PostgreSQL', { exact: true })).toBeVisible();
  await expect(page.getByText(/100\.0 MiB/)).toBeVisible();
  await expect(page.locator('body')).not.toContainText(
    /secret-password|must-never-render|private-host/i,
  );
  expect(healthCalls).toBeGreaterThan(0);

  const unauthorized = await page.context().newPage();
  let unauthorizedHealthCalls = 0;
  await installApiScenario(unauthorized, {
    profile: 'admin',
    sites: [buildSite()],
    handlers: [
      ({ path }) => {
        if (path === '/api/v1/health') unauthorizedHealthCalls += 1;
        return false;
      },
    ],
  });
  await unauthorized.goto('/health');
  await expect(unauthorized).not.toHaveURL(/\/health$/);
  expect(unauthorizedHealthCalls).toBe(0);
});

test('health exposes a recoverable error state', async ({ page }) => {
  let failing = true;
  await installApiScenario(page, {
    profile: 'root',
    sites: [buildSite()],
    handlers: [
      async ({ path, route }) => {
        if (path !== '/api/v1/health') return false;
        if (failing) await route.fulfill(apiFailure(503, 'HEALTH_UNAVAILABLE'));
        else {
          await route.fulfill({
            json: {
              status: 'ok',
              timestamp: '2026-10-10T10:00:00Z',
              uptime: 60,
              checks: {
                database: 'up',
                memoryUsage: { rss: 1, heapTotal: 1, heapUsed: 1, external: 1, arrayBuffers: 1 },
              },
            },
          });
        }
        return true;
      },
    ],
  });
  await page.goto('/health');
  await expect(page.getByText(/impossible de charger/i)).toBeVisible();
  failing = false;
  await page.getByRole('button', { name: /réessayer/i }).click();
  await expect(page.getByRole('heading', { name: /santé de la plateforme/i })).toBeVisible();
});
