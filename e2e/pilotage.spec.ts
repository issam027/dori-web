import { expect, test, type Page } from '@playwright/test';
import {
  apiEnvelope,
  apiFailure,
  buildMonitoringLive,
  buildMonitoringSeries,
  buildPerson,
  buildQueue,
  buildRegistration,
  buildSite,
  installApiScenario,
  paginated,
} from './support/scenario-fixtures';

const reportMetrics = (registered: number, served: number) => ({
  registered,
  served,
  noShow: 1,
  cancelled: 0,
  averageWaitMinutes: 12,
  averageServiceMinutes: 6,
});

const reportSeries = (from: string, to: string, queueId?: string) => {
  const queues = [
    {
      queueId: '00000000-0000-4000-8000-000000000010',
      queueName: 'Accueil général',
      ...reportMetrics(10, 8),
    },
    {
      queueId: '00000000-0000-4000-8000-000000000011',
      queueName: 'Documents',
      ...reportMetrics(5, 4),
    },
  ];
  const selected = queueId ? queues.filter((queue) => queue.queueId === queueId) : queues;
  const totals = selected.reduce(
    (sum, queue) => ({
      registered: sum.registered + queue.registered,
      served: sum.served + queue.served,
      noShow: sum.noShow + queue.noShow,
      cancelled: sum.cancelled + queue.cancelled,
      averageWaitMinutes: 12,
      averageServiceMinutes: 6,
    }),
    reportMetrics(0, 0),
  );
  return buildMonitoringSeries({
    appliedFilters: {
      from,
      to,
      bucket: 'day',
      siteId: '00000000-0000-4000-8000-000000000001',
      queueIds: queueId ? [queueId] : [],
    },
    totals,
    series: [{ periodStart: from, ...totals }],
    breakdowns: {
      byQueue: selected,
      byUser: [],
      byTier: [],
      byEntryType: [
        { entryType: 'walkin', count: 12 },
        { entryType: 'appointment', count: 3 },
      ],
      byStatus: [],
    },
  });
};

test('supervision renders operational cards, refreshes them and handles an empty scope', async ({
  page,
}) => {
  let loadCalls = 0;
  await installApiScenario(page, {
    profile: 'manager',
    handlers: [
      async ({ path, route }) => {
        if (path === '/api/v1/monitoring/live') {
          loadCalls += 1;
          await route.fulfill({
            json: apiEnvelope(
              buildMonitoringLive({
                totals: {
                  waiting: loadCalls > 1 ? 9 : 7,
                  inProgress: 1,
                  activeQueues: 1,
                  openDesks: 1,
                  activeOperators: 1,
                  longestWaitMinutes: 12,
                },
                queues: [
                  {
                    queueId: '00000000-0000-4000-8000-000000000010',
                    queueName: 'Accueil général',
                    waiting: loadCalls > 1 ? 9 : 7,
                    inProgress: 1,
                    openDesks: 1,
                    activeOperators: 1,
                    estimatedWaitMinutes: 12,
                    longestWaitMinutes: 12,
                  },
                ],
              }),
            ),
          });
          return true;
        }
        return false;
      },
    ],
  });
  await page.goto('/control-room');
  await expect(page.getByRole('heading', { name: /supervision temps réel/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Accueil général' })).toBeVisible();
  await expect(page.locator('.supervision-queue-card')).toContainText(/7.*en attente/i);
  const callsBeforeRefresh = loadCalls;
  await page.getByRole('button', { name: /actualiser/i }).click();
  await expect.poll(() => loadCalls).toBeGreaterThan(callsBeforeRefresh);

  await page.route('**/api/v1/monitoring/live**', async (route) => {
    await route.fulfill({ json: apiEnvelope(buildMonitoringLive()) });
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
        if (path !== '/api/v1/monitoring/live') return false;
        if (failing) {
          await route.fulfill(apiFailure(503, 'REPORTS_UNAVAILABLE'));
        } else {
          await route.fulfill({ json: apiEnvelope(buildMonitoringLive()) });
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

test('reports apply the selected period to every queue and render an empty state', async ({
  page,
}) => {
  const requests: Array<{ from: string; to: string; queueIds: string | null }> = [];
  const queues = [
    buildQueue({ queueId: '00000000-0000-4000-8000-000000000010', queueName: 'Accueil général' }),
    buildQueue({ queueId: '00000000-0000-4000-8000-000000000011', queueName: 'Documents' }),
  ];
  await installApiScenario(page, {
    profile: 'manager',
    sites: [buildSite({ timezone: 'Europe/Paris' })],
    queues,
    handlers: [
      async ({ path, url, route }) => {
        if (path !== '/api/v1/monitoring/series') return false;
        const from = url.searchParams.get('from') ?? '';
        const to = url.searchParams.get('to') ?? '';
        const queueIds = url.searchParams.get('queueIds');
        requests.push({ from, to, queueIds });
        await route.fulfill({
          json: apiEnvelope(reportSeries(from, to, queueIds || undefined)),
        });
        return true;
      },
    ],
  });
  await page.goto('/reports');
  await expect(page.getByRole('main')).toContainText('Accueil général');
  await expect(page.getByRole('main')).toContainText('Documents');
  const startDate = page.getByLabel(/date de début/i);
  const endDate = page.getByLabel(/date de fin/i);
  await startDate.fill('2026-09-18');
  await endDate.fill('2026-09-20');
  await expect
    .poll(() =>
      [
        ...new Set(
          requests
            .filter(
              (request) =>
                request.from.startsWith('2026-09-18') && request.to.startsWith('2026-09-21'),
            )
            .map((request) => request.queueIds)
            .filter((queueIds): queueIds is string => Boolean(queueIds)),
        ),
      ].sort(),
    )
    .toEqual(['00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000011']);
  await expect(page.getByRole('main').getByRole('heading', { name: /rapports/i })).toBeVisible();

  await page.route('**/api/v1/monitoring/series**', async (route) => {
    await route.fulfill({ json: apiEnvelope(buildMonitoringSeries()) });
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
        if (path !== '/api/v1/monitoring/series') return false;
        if (failing) await route.fulfill(apiFailure(503, 'DAILY_REPORT_UNAVAILABLE'));
        else {
          const from = '2026-10-05T00:00:00.000Z';
          const to = '2026-10-12T00:00:00.000Z';
          await route.fulfill({
            json: apiEnvelope(reportSeries(from, to, '00000000-0000-4000-8000-000000000010')),
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
  await expect(page.getByRole('main')).toContainText('Accueil E2E');
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
                  registrationId: '00000000-0000-4000-8000-000000000700',
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
          else
            await route.fulfill({
              json: apiEnvelope({ notificationId: '00000000-0000-4000-8000-000000000900' }),
            });
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
  await page.getByRole('textbox', { name: /rechercher une personne/i }).fill('Lina');
  await page.getByRole('button', { name: /Lina Martin/i }).click();
  await page.getByRole('button', { name: /suivant/i }).click();
  await page.getByRole('button', { name: /ticket.*A700/i }).click();
  await page.getByRole('button', { name: /suivant/i }).click();
}

test('guided notification validates the recipient and confirms a successful send', async ({
  page,
}) => {
  const getSentBody = await installNotificationScenario(page, () => false);
  await page.goto('/notifications');
  await reachNotificationMessageStep(page);
  await expect(
    page.getByRole('dialog').getByLabel(/canal/i).locator('option[value="email"]'),
  ).toHaveAttribute('disabled', '');
  await expect(page.getByText(/destinataire.*\+3.*78/i)).toBeVisible();
  await page.getByLabel(/message/i).fill('Votre passage approche.');
  await page.getByRole('button', { name: /envoyer la notification/i }).click();
  await expect(page.getByText(/notification mise en file/i)).toBeVisible();
  expect(getSentBody()).toEqual({
    registrationId: '00000000-0000-4000-8000-000000000700',
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
        if (path !== '/api/v1/monitoring/health') return false;
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
        if (path === '/api/v1/monitoring/health') unauthorizedHealthCalls += 1;
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
        if (path !== '/api/v1/monitoring/health') return false;
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
