import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function mockAuthenticatedApi(page: Page, technical = false) {
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const envelope = (data: unknown) => ({
      code: 'OK',
      translationKey: null,
      translationParams: {},
      data,
    });
    if (path.endsWith('/auth/login'))
      return route.fulfill({
        json: envelope({ accessToken: 'visual-token', refreshToken: 'cookie', user: {} }),
      });
    if (path.endsWith('/auth/me'))
      return route.fulfill({
        json: envelope({
          userId: '00000000-0000-4000-8000-000000000001',
          username: technical ? 'kiosk' : 'root',
          userType: technical ? 'kiosk' : 'human',
          roles: [technical ? 'kiosk' : 'root'],
          permissions: technical
            ? [
                'registration_register',
                'registration_create',
                'appointment_lookup',
                'appointment_checkin',
                'queue_view',
                'tier_view',
              ]
            : [
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
          mustChangePassword: false,
          scope: technical
            ? {
                isGlobal: false,
                siteIds: ['00000000-0000-4000-8000-000000000001'],
                queueIds: ['00000000-0000-4000-8000-000000000010'],
              }
            : {
                isGlobal: true,
                siteIds: [
                  '00000000-0000-4000-8000-000000000001',
                  '00000000-0000-4000-8000-000000000002',
                ],
                queueIds: ['00000000-0000-4000-8000-000000000010'],
              },
        }),
      });
    if (path === '/api/v1/sites')
      return route.fulfill({
        json: envelope({
          page: 1,
          pageSize: 100,
          total: 2,
          totalPages: 1,
          items: [
            {
              siteId: '00000000-0000-4000-8000-000000000001',
              siteName: 'Clinique El Manar',
              timezone: 'Europe/Paris',
              locale: 'fr',
              isActive: true,
            },
            {
              siteId: '00000000-0000-4000-8000-000000000002',
              siteName: 'Centre Lac 2',
              timezone: 'Europe/Paris',
              locale: 'fr',
              isActive: true,
            },
          ],
        }),
      });
    if (/^\/api\/v1\/sites\/[^/]+$/.test(path))
      return route.fulfill({
        json: envelope({
          siteId: path.split('/').at(-1),
          siteName: 'Clinique El Manar',
          timezone: 'Europe/Paris',
          locale: 'fr',
          isActive: true,
        }),
      });
    if (/^\/api\/v1\/sites\/[^/]+\/cockpit$/.test(path))
      return route.fulfill({
        json: envelope({
          siteId: '00000000-0000-4000-8000-000000000001',
          siteName: 'Clinique El Manar',
          serverTime: '2026-10-08T12:00:00Z',
          operator: {
            userId: '00000000-0000-4000-8000-000000000001',
            username: 'root',
            fullName: 'Root Operator',
          },
          queues: [
            {
              queueId: '00000000-0000-4000-8000-000000000010',
              queueCode: 'ACC',
              queueName: 'Accueil',
              waitingCount: 4,
              remainingAppointmentsCount: 0,
              estimatedWaitMinutes: 12,
              threadCount: 2,
              occupiedThreadsCount: 0,
              availableThreadNumbers: [1, 2],
              sessions: [],
              currentOperatorSessionId: null,
              sessionOpening: {
                allowed: true,
                availableThreadNumbers: [1, 2],
                requiresReplacement: false,
                replaceableSessions: [],
              },
              centralizedNext: { eligible: false, unavailableReason: 'no_session' },
              activeCall: null,
              nextCandidates: [],
            },
          ],
          recentPassages: [],
        }),
      });
    if (/^\/api\/v1\/queues\/[^/]+\/availability$/.test(path))
      return route.fulfill({ json: envelope({ timezone: 'Europe/Paris', days: [] }) });
    if (path.includes('/next-preview')) return route.fulfill({ json: envelope([]) });
    if (path === '/api/v1/monitoring/health')
      return route.fulfill({
        json: {
          status: 'ok',
          timestamp: '2026-10-08T12:00:00Z',
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
        },
      });
    if (path === '/api/v1/queues/00000000-0000-4000-8000-000000000010/display')
      return route.fulfill({
        json: envelope({
          queueId: '00000000-0000-4000-8000-000000000010',
          queueName: 'Accueil',
          activeThreads: [
            { threadNumber: 2, currentTicket: 'A014', calledAt: '2026-10-08T08:00:00Z' },
          ],
          nextTickets: ['A015', 'A016', 'A017'],
        }),
      });
    if (path === '/api/v1/queues/00000000-0000-4000-8000-000000000010/tiers')
      return route.fulfill({
        json: envelope({
          page: 1,
          pageSize: 100,
          total: 1,
          totalPages: 1,
          items: [
            {
              queueId: '00000000-0000-4000-8000-000000000010',
              tierId: '00000000-0000-4000-8000-000000000002',
              price: 0,
              currency: 'EUR',
              currencyOrigin: 'queue',
              isActive: true,
              isDefault: true,
              displayOrder: 1,
              tier: {
                tierId: '00000000-0000-4000-8000-000000000002',
                tierCode: 'STD',
                tierName: 'Standard',
                isSystem: true,
                isActive: true,
              },
            },
          ],
        }),
      });
    if (path === '/api/v1/public/registrations/position')
      return route.fulfill({
        json: envelope({
          ticketNumber: 'A014',
          position: 2,
          estimatedWaitMinutes: 8,
          status: 'waiting',
          queueName: 'Accueil',
        }),
      });
    if (path === '/api/v1/monitoring/live')
      return route.fulfill({
        json: envelope({
          generatedAt: '2026-10-08T12:00:00Z',
          siteId: '00000000-0000-4000-8000-000000000001',
          timezone: 'Europe/Paris',
          totals: {
            waiting: 4,
            inProgress: 1,
            activeQueues: 1,
            openDesks: 1,
            activeOperators: 1,
            longestWaitMinutes: 12,
          },
          queues: [
            {
              queueId: '00000000-0000-4000-8000-000000000010',
              queueName: 'Accueil',
              waiting: 4,
              inProgress: 1,
              openDesks: 1,
              activeOperators: 1,
              estimatedWaitMinutes: 12,
              longestWaitMinutes: 12,
            },
          ],
          operators: [],
          alerts: [],
        }),
      });
    if (path === '/api/v1/monitoring/series')
      return route.fulfill({
        json: envelope({
          generatedAt: '2026-10-08T12:00:00Z',
          timezone: 'Europe/Paris',
          appliedFilters: {
            from: '2026-10-08T00:00:00.000Z',
            to: '2026-10-09T00:00:00.000Z',
            bucket: 'day',
            siteId: '00000000-0000-4000-8000-000000000001',
          },
          totals: {
            registered: 10,
            served: 7,
            noShow: 1,
            cancelled: 0,
            averageWaitMinutes: 12,
            averageServiceMinutes: 6,
          },
          series: [
            {
              periodStart: '2026-10-08T00:00:00.000Z',
              registered: 10,
              served: 7,
              noShow: 1,
              cancelled: 0,
              averageWaitMinutes: 12,
              averageServiceMinutes: 6,
            },
          ],
          breakdowns: {
            byQueue: [
              {
                queueId: '00000000-0000-4000-8000-000000000010',
                queueName: 'Accueil',
                registered: 10,
                served: 7,
                noShow: 1,
                cancelled: 0,
                averageWaitMinutes: 12,
                averageServiceMinutes: 6,
              },
            ],
            byUser: [],
            byTier: [],
            byEntryType: [
              { entryType: 'walkin', count: 8 },
              { entryType: 'appointment', count: 2 },
            ],
            byStatus: [],
          },
        }),
      });
    if (path === '/api/v1/queues/00000000-0000-4000-8000-000000000010/status')
      return route.fulfill({
        json: envelope({
          queueId: '00000000-0000-4000-8000-000000000010',
          waitingCount: 4,
          activeThreads: 1,
          estimatedWaitMinutes: 12,
          nextAppointments: [],
        }),
      });
    if (path === '/api/v1/queues/00000000-0000-4000-8000-000000000010/threads')
      return route.fulfill({
        json: envelope({
          page: 1,
          pageSize: 100,
          total: 1,
          totalPages: 1,
          items: [
            {
              threadNumber: 1,
              status: 'occupied',
              session: {
                sessionId: '00000000-0000-4000-8000-000000000002',
                userId: '00000000-0000-4000-8000-000000000001',
                username: 'root',
                connectedAt: '2026-10-08T08:00:00Z',
                lastSeenAt: '2026-10-08T08:01:00Z',
                inactiveMinutes: 0,
              },
            },
          ],
        }),
      });
    if (path === '/api/v1/queues/00000000-0000-4000-8000-000000000010/sessions')
      return route.fulfill({
        json: envelope({
          page: 1,
          pageSize: 100,
          total: 1,
          totalPages: 1,
          items: [
            {
              sessionId: '00000000-0000-4000-8000-000000000002',
              queueId: '00000000-0000-4000-8000-000000000010',
              threadNumber: 1,
              userId: '00000000-0000-4000-8000-000000000001',
              username: 'root',
              mode: 'active',
              connectedAt: '2026-10-08T08:00:00Z',
            },
          ],
        }),
      });
    if (path === '/api/v1/notifications')
      return route.fulfill({
        json: envelope({
          page: 1,
          pageSize: 25,
          total: 1,
          totalPages: 1,
          items: [
            {
              notificationId: '00000000-0000-4000-8000-000000000003',
              registrationId: '00000000-0000-4000-8000-000000000005',
              ticketNumber: 'A005',
              channel: 'sms',
              notificationType: 'manual',
              locale: 'fr',
              recipient: '+33612345678',
              notificationContent: 'Votre passage approche',
              notificationStatus: 'delivered',
              attemptCount: 1,
              createdAt: '2026-10-08T08:00:00Z',
              updatedAt: '2026-10-08T08:01:00Z',
            },
          ],
        }),
      });
    if (path === '/api/v1/queues')
      return route.fulfill({
        json: envelope({
          page: 1,
          pageSize: 100,
          total: 1,
          totalPages: 1,
          items: [
            {
              queueId: '00000000-0000-4000-8000-000000000010',
              queueCode: 'ACC',
              queueName: 'Accueil',
              siteId: '00000000-0000-4000-8000-000000000001',
              isActive: true,
              appointmentsEnabled: true,
              workingHoursStart: '08:00:00',
              workingHoursEnd: '17:00:00',
            },
          ],
        }),
      });
    return route.fulfill({
      json: envelope({ page: 1, pageSize: 100, total: 0, totalPages: 0, items: [] }),
    });
  });
}

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
]) {
  test(`login remains responsive at ${String(viewport.width)}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /bienvenue/i })).toBeVisible();
    expect(
      await page.evaluate<boolean>(
        'document.documentElement.scrollWidth <= document.documentElement.clientWidth',
      ),
    ).toBe(true);
  });
}

async function activateFirstSite(page: Page) {
  await page.goto('/portfolio');
  await page
    .getByRole('button', { name: /travailler sur ce site/i })
    .first()
    .click();
  await expect(page.getByText('Clinique El Manar').first()).toBeVisible();
}

async function applyTheme(page: Page, theme: string) {
  await page.evaluate(`(() => {
    const root = document.documentElement;
    root.dataset.theme = ${JSON.stringify(theme)};
    root.style.removeProperty('--color-accent');
    root.style.removeProperty('--color-primary-soft');
    root.style.removeProperty('--color-primary-contrast');
  })()`);
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
}

test('authenticated shell matches the expected visual structure', async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto('/desk');
  await expect(page).toHaveURL(/\/desk$/);
  await expect(page.getByRole('heading', { name: /choisissez un site actif/i })).toBeVisible();
  await page.getByRole('link', { name: /ouvrir le portefeuille/i }).click();
  await page
    .getByRole('button', { name: /travailler sur ce site/i })
    .first()
    .click();
  await page.goto('/desk');
  await expect(page.locator('.sidebar')).toBeVisible();
  await expect(page.locator('.sidebar')).toHaveCSS('background-image', /linear-gradient/);
  await expect(page.getByRole('banner')).toHaveCSS('position', 'sticky');
  await expect(page.getByRole('main').getByRole('heading', { name: /cockpit/i })).toBeVisible();
  await expect(page.getByRole('banner')).toContainText('Clinique El Manar');
});

test('phase 8 kiosk and display stay PII-free at 1080p and 4K', async ({ page }) => {
  await mockAuthenticatedApi(page, true);
  await page.goto('/kiosk');
  await expect(page).toHaveURL(/\/kiosk$/);
  await expect(page.getByRole('heading', { name: /comment pouvons-nous/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /sans rendez-vous/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /mentions légales/i })).toHaveCount(0);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.evaluate(
    "history.pushState({}, '', '/display?queueId=00000000-0000-4000-8000-000000000010'); window.dispatchEvent(new PopStateEvent('popstate'))",
  );
  await expect(page.getByText('A014')).toBeVisible();
  await expect(page.getByText(/guichet 2/i)).toBeVisible();
  for (const theme of ['light', 'soft-light', 'soft-dark', 'dark']) {
    await page.evaluate(`document.documentElement.dataset.theme = ${JSON.stringify(theme)}`);
    await expect(page.getByText('A014')).toBeVisible();
  }
  expect(
    await page.evaluate<boolean>(
      'document.documentElement.scrollHeight <= document.documentElement.clientHeight',
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 3840, height: 2160 });
  expect(
    await page.evaluate<boolean>(
      'document.documentElement.scrollWidth <= document.documentElement.clientWidth',
    ),
  ).toBe(true);
  await expect(page.locator('body')).not.toContainText(/patient|nom|email|téléphone/i);
});

test('human users keep the application context while previewing device experiences', async ({
  page,
}) => {
  await mockAuthenticatedApi(page);
  await activateFirstSite(page);

  await page.goto('/kiosk');
  await expect(page.locator('.topbar')).toBeVisible();
  await expect(page.locator('.experience-preview-kiosk')).toBeVisible();
  await expect(page.getByRole('heading', { name: /comment pouvons-nous/i })).toBeVisible();
  await expect(page.getByText('Prévisualisation')).toHaveCount(0);

  await page.goto('/display?queueId=00000000-0000-4000-8000-000000000010');
  await expect(page.locator('.topbar')).toBeVisible();
  await expect(page.locator('.experience-preview-display')).toBeVisible();
  await expect(page.getByText('A014')).toBeVisible();
  await expect(page.getByText('Prévisualisation')).toHaveCount(0);
});

test('phase 8 tracking consumes its token and works on mobile RTL in four themes', async ({
  page,
}) => {
  await mockAuthenticatedApi(page);
  await activateFirstSite(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/track?token=opaque-secret');
  await expect(page).toHaveURL(/\/track$/);
  await expect(page.getByRole('banner')).toContainText('DORIFY');
  await expect(page.locator('.tracking-screen')).toBeVisible();
  await expect(page.getByText('A014')).toBeVisible();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
  await page.evaluate("document.documentElement.dir = 'rtl'; document.documentElement.lang = 'ar'");
  for (const theme of ['light', 'soft-light', 'soft-dark', 'dark']) {
    await applyTheme(page, theme);
    await expect(page.getByRole('button', { name: /son et vibration/i })).toBeVisible();
    expect(
      await page.evaluate<boolean>(
        'document.documentElement.scrollWidth <= document.documentElement.clientWidth',
      ),
    ).toBe(true);
  }
  await expect(page.getByRole('link', { name: /mentions légales/i })).toBeVisible();
});

test('phase 10 health and legal return preserve the exact origin', async ({ page }) => {
  await mockAuthenticatedApi(page);
  await activateFirstSite(page);
  await page.goto('/desk');
  await page.getByRole('button', { name: /système/i }).click();
  await page.getByRole('link', { name: /état de la plateforme/i }).click();
  await expect(
    page.getByRole('main').getByRole('heading', { name: /santé de la plateforme/i }),
  ).toBeVisible();
  await page.evaluate(
    "history.replaceState(history.state, '', '/health?probe=manual#memory'); window.dispatchEvent(new PopStateEvent('popstate'))",
  );
  await expect(page).toHaveURL(/\/health\?probe=manual#memory$/);
  await expect(page.getByText('ok', { exact: true })).toBeVisible();
  await expect(page.getByText(/\d{1,2} oct\. 2026/)).toBeVisible();
  await page.getByRole('button', { name: /actualiser/i }).click();
  await page.getByRole('link', { name: /mentions légales/i }).click();
  await expect(
    page.getByRole('heading', { name: /mentions légales et confidentialité/i }),
  ).toBeVisible();
  await page.getByRole('button', { name: /retour à l’espace précédent/i }).click();
  await expect(page).toHaveURL(/\/health\?probe=manual#memory$/);
});

test('phase 10 legal content is public before authentication', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('link', { name: /mentions légales/i }).click();
  await expect(
    page.getByRole('heading', { name: /mentions légales et confidentialité/i }),
  ).toBeVisible();
  await page.getByRole('button', { name: /retour à l’espace précédent/i }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('phase 7 supervision routes render API-backed views', async ({ page }) => {
  await mockAuthenticatedApi(page);
  await activateFirstSite(page);
  await page.goto('/desk');
  await page.getByRole('button', { name: /pilotage/i }).click();
  await page.getByRole('link', { name: /supervision/i }).click();
  await expect(
    page.getByRole('main').getByRole('heading', { name: /supervision temps réel/i }),
  ).toBeVisible();
  await expect(page.getByText('4', { exact: true }).first()).toBeVisible();
  await page.getByRole('link', { name: /rapports/i }).click();
  await expect(page.getByRole('main').getByRole('heading', { name: 'Rapports' })).toBeVisible();
  await expect(page.locator('.metric-value').filter({ hasText: '12 min' })).toBeVisible();
  await page.getByRole('link', { name: /notifications/i }).click();
  await expect(
    page.getByRole('main').getByRole('heading', { name: 'Notifications' }),
  ).toBeVisible();
  await expect(page.getByText('+3••••78').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /nouvel envoi/i })).toBeVisible();
});

test('WCAG 2.2 AA automated audit has no serious violations', async ({ page }) => {
  test.setTimeout(90_000);
  const themes = ['light', 'soft-light', 'soft-dark', 'dark'];
  const seriousViolations = async () => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    return results.violations.filter((violation) =>
      ['critical', 'serious'].includes(violation.impact ?? ''),
    );
  };

  for (const theme of themes) {
    await page.goto('/login');
    await applyTheme(page, theme);
    expect(await seriousViolations(), `login / ${theme}`).toEqual([]);
  }

  await mockAuthenticatedApi(page);
  await activateFirstSite(page);
  for (const path of ['/desk', '/onboarding']) {
    for (const theme of themes) {
      await page.goto(path);
      await applyTheme(page, theme);
      expect(await seriousViolations(), `${path} / ${theme}`).toEqual([]);
    }
  }
});

test('desktop, tablet, mobile and TV remain usable in all four themes', async ({ page }) => {
  test.setTimeout(60_000);
  await mockAuthenticatedApi(page);
  await activateFirstSite(page);
  const viewports = [
    { width: 1440, height: 900 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 1920, height: 1080 },
  ];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const theme of ['light', 'soft-light', 'soft-dark', 'dark']) {
      await page.evaluate(`document.documentElement.dataset.theme = ${JSON.stringify(theme)}`);
      await page.goto('/desk');
      await expect(page.getByRole('main').getByRole('heading', { name: /cockpit/i })).toBeVisible();
      expect(
        await page.evaluate<boolean>(
          'document.documentElement.scrollWidth <= document.documentElement.clientWidth',
        ),
      ).toBe(true);
    }
  }
});

test('cockpit visual hierarchy remains stable on desktop and mobile', async ({ page }) => {
  await mockAuthenticatedApi(page);
  await activateFirstSite(page);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/desk');
  await expect(page.getByRole('main').getByRole('heading', { name: /cockpit/i })).toBeVisible();
  await expect(page).toHaveScreenshot('cockpit-desktop-light.png', {
    animations: 'disabled',
    fullPage: true,
    mask: [page.locator('.cockpit-last-sync')],
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/desk');
  await expect(page.getByRole('main').getByRole('heading', { name: /cockpit/i })).toBeVisible();
  await expect(page).toHaveScreenshot('cockpit-mobile-light.png', {
    animations: 'disabled',
    fullPage: true,
    mask: [page.locator('.cockpit-last-sync')],
  });
});

test('application content keeps a denser scale without shrinking the sidebar or wasting wide screens', async ({
  page,
}) => {
  await mockAuthenticatedApi(page);
  await activateFirstSite(page);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/desk');
  await expect(page.locator('.app-content')).toHaveCSS('zoom', '0.95');
  await expect(page.locator('.sidebar')).toHaveCSS('zoom', '1');

  await page.setViewportSize({ width: 3840, height: 1080 });
  await page.goto('/desk');
  const contentBounds = await page.locator('.app-content').boundingBox();
  expect(contentBounds).not.toBeNull();
  expect(contentBounds?.width).toBeGreaterThan(2688);
  expect((contentBounds?.x ?? 0) + (contentBounds?.width ?? 0)).toBeLessThanOrEqual(3840);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/desk');
  await expect(page.locator('.app-content')).toHaveCSS('zoom', '1');
});

test('sidebar keeps its state across routes and follows desktop, tablet and mobile modes', async ({
  page,
}) => {
  await mockAuthenticatedApi(page);
  await activateFirstSite(page);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/desk');
  await expect(page.getByRole('button', { name: 'Ouvrir le menu' })).toBeHidden();
  await page.getByRole('button', { name: 'Réduire le menu' }).click();
  await expect(page.locator('.sidebar')).toHaveClass(/is-collapsed/);

  for (const path of ['/kiosk', '/track', '/onboarding', '/legal']) {
    await page.evaluate(
      `window.history.pushState({}, '', ${JSON.stringify(path)}); window.dispatchEvent(new Event('popstate'));`,
    );
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.locator('.sidebar')).toHaveClass(/is-collapsed/);
  }

  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/desk');
  await expect(page.locator('.sidebar')).toHaveClass(/is-collapsed/);
  await expect(page.getByRole('button', { name: 'Ouvrir le menu' })).toBeHidden();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Ouvrir le menu' })).toBeVisible();
  await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
  await expect(page.locator('.sidebar')).toHaveClass(/is-mobile-open/);
});
