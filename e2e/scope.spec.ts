import { expect, test } from '@playwright/test';
import {
  activateSite,
  buildSite,
  installApiScenario,
  type ApiScenarioHandler,
  type TestProfile,
} from './support/scenario-fixtures';

const alpha = buildSite();
const beta = buildSite({ siteId: 2, siteName: 'Site E2E Beta' });

test('a multi-site user without an active site is guided to the portfolio', async ({ page }) => {
  await installApiScenario(page, { profile: 'root', sites: [alpha, beta] });
  await page.goto('/desk');

  await expect(page.getByRole('heading', { name: /choisissez un site actif/i })).toBeVisible();
  await page.getByRole('link', { name: /ouvrir le portefeuille de sites/i }).click();
  await expect(page).toHaveURL(/\/portfolio$/);
});

test('a single authorized site is activated automatically and portfolio is hidden', async ({
  page,
}) => {
  await installApiScenario(page, { profile: 'operator', sites: [alpha] });
  await page.goto('/desk');

  await expect(page.getByRole('banner').getByText('Site E2E Alpha')).toBeVisible();
  await expect(page.getByRole('link', { name: /portefeuille de sites/i })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('dori.activeSiteId'))).toBe('1');
});

test('changing site from the portfolio refreshes scoped data and the persistent topbar', async ({
  page,
}) => {
  const queueSiteIds: string[] = [];
  const observeQueues: ApiScenarioHandler = ({ path, url }) => {
    if (path === '/api/v1/queues') queueSiteIds.push(url.searchParams.get('siteId') ?? '');
    return false;
  };
  await page.addInitScript(() => {
    if (sessionStorage.getItem('dori.activeSiteId') === null) {
      sessionStorage.setItem('dori.activeSiteId', '1');
    }
  });
  await installApiScenario(page, {
    profile: 'root',
    sites: [alpha, beta],
    handlers: [observeQueues],
  });

  await page.goto('/desk');
  await expect(page.getByRole('banner').getByText('Site E2E Alpha')).toBeVisible();
  await activateSite(page, 'Site E2E Beta');
  for (const path of [
    '/desk',
    '/my-queues',
    '/appointments',
    '/control-room',
    '/reports',
    '/notifications',
    '/health',
    '/onboarding',
    '/settings',
    '/profile',
    '/portfolio',
  ]) {
    await page.goto(path);
    await expect(page.getByRole('banner').getByText('Site E2E Beta')).toBeVisible();
  }
  expect(queueSiteIds).toContain('1');
  expect(queueSiteIds).toContain('2');
});

test('a stored site outside the authenticated scope is discarded', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('dori.activeSiteId') === null) {
      sessionStorage.setItem('dori.activeSiteId', '999');
    }
  });
  await installApiScenario(page, { profile: 'operator', sites: [alpha] });
  await page.goto('/desk');

  await expect(page.getByRole('banner').getByText('Site E2E Alpha')).toBeVisible();
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('dori.activeSiteId'))).toBe('1');
  await expect(page.locator('body')).not.toContainText('999');
});

const routeMatrix: Array<{
  profile: TestProfile;
  allowed: string;
  forbidden: string;
}> = [
  { profile: 'root', allowed: '/health', forbidden: '/device-mode' },
  { profile: 'admin', allowed: '/onboarding', forbidden: '/health' },
  { profile: 'manager', allowed: '/control-room', forbidden: '/health' },
  { profile: 'operator', allowed: '/appointments', forbidden: '/notifications' },
];

for (const scenario of routeMatrix) {
  test(`${scenario.profile} permissions authorize and reject the expected private routes`, async ({
    page,
  }) => {
    await installApiScenario(page, { profile: scenario.profile, sites: [alpha] });
    await page.goto(scenario.allowed);
    await expect(page).toHaveURL(new RegExp(`${scenario.allowed.replace('/', '\\/')}$`));

    await page.goto(scenario.forbidden);
    await expect(page).toHaveURL(/\/forbidden$/);
  });
}

test('a kiosk account is restricted to device mode and public experiences', async ({ page }) => {
  await installApiScenario(page, { profile: 'kiosk', sites: [alpha] });
  await page.goto('/device-mode');
  await expect(page).toHaveURL(/\/device-mode$/);
  await expect(
    page.getByRole('heading', { name: /quel écran souhaitez-vous afficher/i }),
  ).toBeVisible();

  await page.goto('/display');
  await expect(page).toHaveURL(/\/display$/);
  await page.goto('/desk');
  await expect(page).toHaveURL(/\/forbidden$/);
});
