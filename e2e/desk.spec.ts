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
  type ApiScenarioHandler,
  useFixedClock as installFixedClock,
} from './support/scenario-fixtures';

const site = buildSite();
const primaryQueue = buildQueue({ queueId: 10, queueName: 'Accueil prioritaire' });
const queues = [
  primaryQueue,
  buildQueue({ queueId: 11, queueName: 'Accueil secondaire' }),
];

const session = (queueId = 10) => ({
  sessionId: queueId * 10,
  queueId,
  threadNumber: 1,
  userId: 1,
  username: 'operator.e2e',
  mode: 'active',
  connectedAt: '2026-10-09T09:00:00Z',
});

const call = (registrationId = 500, ticketNumber = 'E001') => ({
  registrationId,
  ticketNumber,
  entryType: 'walkin',
  scheduledTime: null,
  calledEarly: false,
  tier: { tierId: 1, tierName: 'Standard E2E' },
  status: 'in_service',
  sessionId: 100,
  threadNumber: 1,
  priorityScore: 10,
  calledAt: '2026-10-09T09:15:00Z',
  person: {},
});

async function installDesk(
  page: Page,
  handlers: ApiScenarioHandler[],
  configuredQueues: Record<string, unknown>[] = queues,
) {
  await installFixedClock(page, '2026-10-09T09:30:00Z');
  await installApiScenario(page, {
    profile: 'operator',
    sites: [site],
    queues: configuredQueues,
    handlers,
  });
}

function activeSessionHandler(activeQueueIds: Set<number>): ApiScenarioHandler {
  return async ({ method, path, route }) => {
    const match = path.match(/^\/api\/v1\/queues\/(\d+)\/sessions(?:\/(\d+))?$/);
    if (!match) return false;
    const queueId = Number(match[1]);
    if (method === 'GET') {
      await route.fulfill({
        json: apiEnvelope(paginated(activeQueueIds.has(queueId) ? [session(queueId)] : [])),
      });
      return true;
    }
    if (method === 'POST') {
      activeQueueIds.add(queueId);
      await route.fulfill({ json: apiEnvelope(session(queueId)) });
      return true;
    }
    if (method === 'DELETE') {
      activeQueueIds.delete(queueId);
      await route.fulfill({ json: apiEnvelope({ sessionId: Number(match[2]), closed: true }) });
      return true;
    }
    return false;
  };
}

test('opening and closing a desk refreshes the card and prioritizes the active queue', async ({
  page,
}) => {
  const activeQueueIds = new Set<number>();
  await installDesk(page, [activeSessionHandler(activeQueueIds)]);
  await page.goto('/desk');
  const primary = page.locator('.queue-desk-card').filter({ hasText: 'Accueil prioritaire' });
  await expect(primary).toHaveClass(/no-open-desk/);
  await primary.getByRole('button', { name: /occuper le guichet/i }).click();
  await expect(primary).toHaveClass(/has-open-desk/);
  await expect(page.locator('.queue-desk-card').first()).toContainText('Accueil prioritaire');
  await primary.getByRole('button', { name: /libérer/i }).click();
  await expect(primary).toHaveClass(/no-open-desk/);
});

test('the cockpit explains when no active queue is configured', async ({ page }) => {
  await installDesk(page, [], []);
  await page.goto('/desk');
  await expect(page.getByText(/aucune file n.est configurée ou active/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /créer un ticket/i })).toHaveCount(0);
});

test('calling and serving a person shows details, disables mutation and builds a printable card', async ({
  page,
}) => {
  let servedCalls = 0;
  const operational: ApiScenarioHandler = async ({ method, path, route }) => {
    if (method === 'GET' && path === '/api/v1/queues/10/sessions') {
      await route.fulfill({ json: apiEnvelope(paginated([session()])) });
      return true;
    }
    if (method === 'GET' && path === '/api/v1/queues/10/status') {
      await route.fulfill({
        json: apiEnvelope({
          queueId: 10,
          waitingCount: 1,
          activeThreads: 1,
          estimatedWaitMinutes: 5,
          nextAppointments: [],
        }),
      });
      return true;
    }
    if (method === 'POST' && path === '/api/v1/queues/10/next') {
      await route.fulfill({ json: apiEnvelope(call()) });
      return true;
    }
    if (method === 'GET' && path === '/api/v1/registrations/500') {
      await route.fulfill({
        json: apiEnvelope(
          buildRegistration({
            status: 'in_service',
            createdAt: '2026-10-09T09:00:00Z',
            updatedAt: '2026-10-09T09:15:00Z',
            businessDate: '2026-10-09',
            registrationTrackingToken: 'desk-e2e',
            tierId: 1,
          }),
        ),
      });
      return true;
    }
    if (method === 'GET' && path === '/api/v1/persons/100') {
      await route.fulfill({
        json: apiEnvelope(buildPerson({ firstName: null, lastName: 'Martin' })),
      });
      return true;
    }
    if (method === 'GET' && path === '/api/v1/persons/100/notes') {
      await route.fulfill({ json: apiEnvelope({ ...paginated([{}]), total: 3 }) });
      return true;
    }
    if (method === 'POST' && path === '/api/v1/registrations/500/served') {
      servedCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 150));
      await route.fulfill({ json: apiEnvelope({ registrationId: 500, status: 'served' }) });
      return true;
    }
    return false;
  };
  await page.addInitScript(
    "Object.defineProperty(window, 'print', { configurable: true, value: () => { document.body.dataset.printCalled = 'true'; } });",
  );
  await installDesk(page, [operational], [primaryQueue]);
  await page.goto('/desk');
  await page.getByRole('button', { name: /appeler le suivant/i }).click();
  const active = page.locator('.active-call');
  await expect(active).toContainText('Martin');
  await expect(active).toContainText(/15 min/i);
  await expect(active.getByLabel(/3 note/i)).toBeVisible();
  const served = active.getByRole('button', { name: /^servi$/i });
  await served.click();
  await expect(served).toBeDisabled();
  await expect(page.getByRole('heading', { name: /récapitulatif des passages/i })).toBeVisible();
  const summary = page.locator('.passage-summary-card');
  await expect(summary).toContainText('Martin');
  await expect(summary).toContainText('E001');
  await expect(summary).toContainText(/document non fiscal/i);
  await expect(summary.locator('.passage-print-legal')).toContainText(/demande du client/i);
  expect(servedCalls).toBe(1);
  await summary.getByRole('button', { name: /imprimer le justificatif/i }).click();
  await expect.poll(() => page.evaluate("document.body.dataset.printCalled")).toBe('true');
});

test('marking a called person absent also creates a discreet passage summary', async ({ page }) => {
  let noShowCalls = 0;
  const absent: ApiScenarioHandler = async ({ method, path, route }) => {
    if (method === 'GET' && path === '/api/v1/queues/10/sessions') {
      await route.fulfill({ json: apiEnvelope(paginated([session()])) });
      return true;
    }
    if (method === 'POST' && path === '/api/v1/queues/10/next') {
      await route.fulfill({ json: apiEnvelope(call()) });
      return true;
    }
    if (method === 'GET' && path === '/api/v1/registrations/500') {
      await route.fulfill({
        json: apiEnvelope(
          buildRegistration({
            createdAt: '2026-10-09T09:00:00Z',
            businessDate: '2026-10-09',
            registrationTrackingToken: 'desk-absent-e2e',
            tierId: 1,
          }),
        ),
      });
      return true;
    }
    if (method === 'GET' && path === '/api/v1/persons/100') {
      await route.fulfill({ json: apiEnvelope(buildPerson()) });
      return true;
    }
    if (method === 'POST' && path === '/api/v1/registrations/500/no-show') {
      noShowCalls += 1;
      await route.fulfill({ json: apiEnvelope({ registrationId: 500, status: 'no_show' }) });
      return true;
    }
    return false;
  };
  await installDesk(page, [absent], [primaryQueue]);
  await page.goto('/desk');
  await page.getByRole('button', { name: /appeler le suivant/i }).click();
  await page.getByRole('button', { name: /^absent$/i }).click();
  await expect(page.locator('.passage-summary-card')).toContainText(/absent/i);
  expect(noShowCalls).toBe(1);
});

test('zero waiting returns an inline business error without losing the shell', async ({ page }) => {
  const empty: ApiScenarioHandler = async ({ method, path, route }) => {
    if (method === 'GET' && path === '/api/v1/queues/10/sessions') {
      await route.fulfill({ json: apiEnvelope(paginated([session()])) });
      return true;
    }
    if (method === 'POST' && path === '/api/v1/queues/10/next') {
      await route.fulfill(apiFailure(422, 'QUEUE_EMPTY'));
      return true;
    }
    return false;
  };
  await installDesk(page, [empty], [primaryQueue]);
  await page.goto('/desk');
  await page.getByRole('button', { name: /appeler le suivant/i }).click();
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page).toHaveURL(/\/desk$/);
  await expect(page.locator('body')).not.toContainText(/page blanche/i);
});

test('two operators competing for the same next ticket produce one call and one conflict', async ({
  browser,
}) => {
  const context = await browser.newContext();
  const first = await context.newPage();
  const second = await context.newPage();
  let attempts = 0;
  const competing: ApiScenarioHandler = async ({ method, path, route }) => {
    if (method === 'GET' && path === '/api/v1/queues/10/sessions') {
      await route.fulfill({ json: apiEnvelope(paginated([session()])) });
      return true;
    }
    if (method === 'POST' && path === '/api/v1/queues/10/next') {
      attempts += 1;
      if (attempts === 1) await route.fulfill({ json: apiEnvelope(call()) });
      else await route.fulfill(apiFailure(409, 'REGISTRATION_ALREADY_CALLED'));
      return true;
    }
    if (method === 'GET' && path === '/api/v1/registrations/500') {
      await route.fulfill({
        json: apiEnvelope(
          buildRegistration({
            status: 'in_service',
            createdAt: '2026-10-09T09:00:00Z',
            updatedAt: '2026-10-09T09:15:00Z',
            businessDate: '2026-10-09',
            registrationTrackingToken: 'concurrency-e2e',
            tierId: 1,
          }),
        ),
      });
      return true;
    }
    if (method === 'GET' && path === '/api/v1/persons/100') {
      await route.fulfill({ json: apiEnvelope(buildPerson()) });
      return true;
    }
    return false;
  };
  await installDesk(first, [competing], [primaryQueue]);
  await installDesk(second, [competing], [primaryQueue]);
  await Promise.all([first.goto('/desk'), second.goto('/desk')]);
  await Promise.all([
    first.getByRole('button', { name: /appeler le suivant/i }).click(),
    second.getByRole('button', { name: /appeler le suivant/i }).click(),
  ]);
  await expect
    .poll(async () =>
      (await first.locator('.active-call').count()) + (await second.locator('.active-call').count()),
    )
    .toBe(1);
  await expect
    .poll(async () =>
      (await first.getByRole('main').getByRole('alert').count()) +
      (await second.getByRole('main').getByRole('alert').count()),
    )
    .toBe(1);
  expect(attempts).toBe(2);
  await context.close();
});
