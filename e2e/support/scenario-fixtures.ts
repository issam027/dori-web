import type { Page, Route } from '@playwright/test';

export type TestProfile = 'root' | 'admin' | 'manager' | 'operator' | 'kiosk';

export interface ApiScenarioRequest {
  method: string;
  path: string;
  url: URL;
  route: Route;
}

export type ApiScenarioHandler = (
  request: ApiScenarioRequest,
) => Promise<boolean> | boolean;

const permissionsByProfile: Record<TestProfile, string[]> = {
  root: [
    'site_view',
    'site_create',
    'site_edit',
    'queue_view',
    'queue_edit',
    'registration_view',
    'registration_call',
    'registration_register',
    'session_operate',
    'appointment_manage',
    'appointment_checkin',
    'report_view',
    'notification_view',
    'notification_send',
    'user_manage_admin',
    'translation_manage',
    'system_manage',
    'tier_view',
  ],
  admin: [
    'site_view',
    'site_create',
    'site_edit',
    'queue_view',
    'queue_edit',
    'registration_view',
    'appointment_manage',
    'report_view',
    'notification_view',
    'notification_send',
    'user_manage_admin',
    'translation_manage',
    'tier_view',
  ],
  manager: [
    'site_view',
    'site_edit',
    'queue_view',
    'queue_edit',
    'registration_view',
    'registration_call',
    'registration_register',
    'session_operate',
    'appointment_manage',
    'appointment_checkin',
    'report_view',
    'notification_view',
    'notification_send',
    'tier_view',
  ],
  operator: [
    'site_view',
    'queue_view',
    'registration_view',
    'registration_call',
    'registration_register',
    'session_operate',
    'appointment_manage',
    'appointment_checkin',
    'tier_view',
  ],
  kiosk: [
    'queue_view',
    'registration_register',
    'registration_create',
    'appointment_lookup',
    'appointment_checkin',
    'tier_view',
  ],
};

export const apiEnvelope = <T>(data: T) => ({
  code: 'OK',
  translationKey: null,
  translationParams: {},
  data,
});

export const paginated = <T>(items: T[], page = 1, pageSize = 100) => ({
  page,
  pageSize,
  total: items.length,
  totalPages: items.length === 0 ? 0 : Math.ceil(items.length / pageSize),
  items,
});

export function buildUser(profile: TestProfile = 'root', overrides: Record<string, unknown> = {}) {
  const technical = profile === 'kiosk';
  return {
    userId: technical ? 900 : 1,
    username: `${profile}.e2e`,
    userType: technical ? 'kiosk' : 'human',
    roles: [profile],
    permissions: permissionsByProfile[profile],
    mustChangePassword: false,
    scope: technical
      ? { isGlobal: false, siteIds: [1], queueIds: [10, 11] }
      : profile === 'root'
        ? { isGlobal: true, siteIds: [1, 2], queueIds: [] }
        : { isGlobal: false, siteIds: [1], queueIds: [10, 11] },
    ...overrides,
  };
}

export function buildSite(overrides: Record<string, unknown> = {}) {
  return {
    siteId: 1,
    siteName: 'Site E2E Alpha',
    timezone: 'Europe/Paris',
    locale: 'fr',
    isActive: true,
    ...overrides,
  };
}

export function buildQueue(overrides: Record<string, unknown> = {}) {
  return {
    queueId: 10,
    queueCode: 'E2E',
    queueName: 'Accueil E2E',
    siteId: 1,
    isActive: true,
    appointmentsEnabled: true,
    workingHoursStart: '08:00:00',
    workingHoursEnd: '17:00:00',
    ...overrides,
  };
}

export function buildTier(overrides: Record<string, unknown> = {}) {
  return {
    tierId: 1,
    tierCode: 'STD',
    tierName: 'Standard E2E',
    description: 'Service de test',
    isSystem: true,
    isActive: true,
    ...overrides,
  };
}

export function buildPerson(overrides: Record<string, unknown> = {}) {
  return {
    personId: 100,
    firstName: 'Personne',
    lastName: 'Test',
    phoneNumber: '+999000000001',
    email: 'personne@test.example',
    birthDate: '1990-01-01',
    languagePreference: 'fr',
    siteId: 1,
    ...overrides,
  };
}

export function buildRegistration(overrides: Record<string, unknown> = {}) {
  return {
    registrationId: 500,
    ticketNumber: 'E001',
    queueId: 10,
    tierId: 1,
    entryType: 'walkin',
    status: 'waiting',
    arrivalTime: '2026-10-09T08:00:00Z',
    personId: 100,
    ...overrides,
  };
}

export function buildAppointment(overrides: Record<string, unknown> = {}) {
  return buildRegistration({
    registrationId: 501,
    ticketNumber: 'R001',
    entryType: 'appointment',
    scheduledTime: '2026-10-10T09:00:00Z',
    ...overrides,
  });
}

export function apiFailure(
  status: number,
  code = `HTTP_${String(status)}`,
  message = 'Erreur E2E contrôlée',
) {
  return {
    status,
    json: {
      code,
      translationKey: null,
      translationParams: {},
      message,
      correlationId: `e2e-${String(status)}`,
    },
  };
}

export async function fulfillAfter(
  route: Route,
  response: Parameters<Route['fulfill']>[0],
  delayMs = 0,
) {
  if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
  await route.fulfill(response);
}

export async function installApiScenario(
  page: Page,
  options: {
    profile?: TestProfile;
    userOverrides?: Record<string, unknown>;
    sites?: Record<string, unknown>[];
    queues?: Record<string, unknown>[];
    tiers?: Record<string, unknown>[];
    handlers?: ApiScenarioHandler[];
  } = {},
) {
  const profile = options.profile ?? 'root';
  const sites = options.sites ?? [buildSite(), buildSite({ siteId: 2, siteName: 'Site E2E Beta' })];
  const queues = options.queues ?? [buildQueue(), buildQueue({ queueId: 11, queueCode: 'BIS' })];
  const tiers = options.tiers ?? [buildTier()];
  const handlers = options.handlers ?? [];

  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const request: ApiScenarioRequest = {
      method: route.request().method(),
      path: url.pathname,
      url,
      route,
    };
    for (const handler of handlers) {
      if (await handler(request)) return;
    }
    if (request.path.endsWith('/auth/login')) {
      await route.fulfill({ json: apiEnvelope({ accessToken: 'e2e-memory-token', user: {} }) });
      return;
    }
    if (request.path.endsWith('/auth/refresh')) {
      await route.fulfill({ json: apiEnvelope({ accessToken: 'e2e-refreshed-token' }) });
      return;
    }
    if (request.path.endsWith('/auth/me')) {
      await route.fulfill({ json: apiEnvelope(buildUser(profile, options.userOverrides)) });
      return;
    }
    if (request.path === '/api/v1/sites') {
      await route.fulfill({ json: apiEnvelope(paginated(sites)) });
      return;
    }
    if (/^\/api\/v1\/sites\/\d+$/.test(request.path)) {
      const siteId = Number(request.path.split('/').at(-1));
      await route.fulfill({
        json: apiEnvelope(sites.find((site) => site.siteId === siteId) ?? sites[0]),
      });
      return;
    }
    if (request.path === '/api/v1/queues') {
      await route.fulfill({ json: apiEnvelope(paginated(queues)) });
      return;
    }
    if (request.path === '/api/v1/tiers') {
      await route.fulfill({ json: apiEnvelope(paginated(tiers)) });
      return;
    }
    if (/^\/api\/v1\/queues\/\d+\/status$/.test(request.path)) {
      const queueId = Number(request.path.split('/')[4]);
      await route.fulfill({
        json: apiEnvelope({
          queueId,
          waitingCount: 0,
          activeThreads: 0,
          estimatedWaitMinutes: 0,
          nextAppointments: [],
        }),
      });
      return;
    }
    if (/^\/api\/v1\/queues\/\d+\/(sessions|threads)$/.test(request.path)) {
      await route.fulfill({ json: apiEnvelope(paginated([])) });
      return;
    }
    if (request.path === '/api/v1/reports/dashboard/summary') {
      await route.fulfill({
        json: apiEnvelope({
          activeSites: sites.filter((site) => site.isActive !== false).length,
          activeQueues: queues.filter((queue) => queue.isActive !== false).length,
          waitingTotal: 0,
          waitingWalkin: 0,
          waitingAppointment: 0,
          appointmentsToday: 0,
        }),
      });
      return;
    }
    if (request.path === '/api/v1/reports/dashboard/queue-load') {
      await route.fulfill({ json: apiEnvelope([]) });
      return;
    }
    if (/^\/api\/v1\/reports\/queues\/\d+\/daily$/.test(request.path)) {
      const queueId = Number(request.path.split('/')[5]);
      const queue = queues.find((candidate) => candidate.queueId === queueId);
      await route.fulfill({
        json: apiEnvelope({
          queueId,
          queueCode: queue?.queueCode ?? 'E2E',
          queueName: queue?.queueName ?? 'File E2E',
          siteName: 'Site E2E Alpha',
          businessDate: '2026-10-09',
          volume: {
            totalRegistered: 0,
            totalWalkin: 0,
            totalAppointment: 0,
            totalServed: 0,
            totalNoShow: 0,
            totalExpired: 0,
            totalCancelled: 0,
            totalOpen: 0,
          },
          kpis: { noShowRate: 0, averageWaitMinutes: 0, averageServiceMinutes: 0 },
        }),
      });
      return;
    }
    if (request.path === '/api/v1/health') {
      await route.fulfill({
        json: {
          status: 'ok',
          timestamp: '2026-10-09T10:00:00Z',
          uptime: 3600,
          checks: {
            database: 'up',
            memoryUsage: {
              rss: 64 * 1024 * 1024,
              heapTotal: 32 * 1024 * 1024,
              heapUsed: 16 * 1024 * 1024,
              external: 1024 * 1024,
              arrayBuffers: 512 * 1024,
            },
          },
        },
      });
      return;
    }
    if (request.path.endsWith('/next-preview')) {
      await route.fulfill({ json: apiEnvelope([]) });
      return;
    }
    await route.fulfill({ json: apiEnvelope(paginated([])) });
  });
}

export async function useFixedClock(page: Page, iso = '2026-10-09T10:00:00Z') {
  await page.clock.install({ time: new Date(iso) });
}

export async function setNetworkOffline(page: Page, offline = true) {
  await page.context().setOffline(offline);
}

export async function activateSite(page: Page, siteName = 'Site E2E Alpha') {
  await page.goto('/portfolio');
  const card = page.locator('.site-card').filter({ hasText: siteName });
  await card.getByRole('button', { name: /activer ce site/i }).click();
}

export async function openNavigationSection(page: Page, name: RegExp) {
  const button = page.getByRole('button', { name });
  if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click();
}

export async function chooseOptionByName(page: Page, label: RegExp, optionLabel: string) {
  await page.getByLabel(label).selectOption({ label: optionLabel });
}
