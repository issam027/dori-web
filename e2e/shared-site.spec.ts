import { expect, test, type Page } from '@playwright/test';
import {
  apiEnvelope,
  buildSite,
  installApiScenario,
  type ApiScenarioHandler,
} from './support/scenario-fixtures';
const alpha = buildSite();
const beta = buildSite({
  siteId: '00000000-0000-4000-8000-000000000002',
  siteName: 'Site E2E Beta',
});
function sessionScenario() {
  let token = '';
  let rotations = 0;
  let inFlight = 0;
  let maxInFlight = 0;
  const headers: string[] = [];
  const handler: ApiScenarioHandler = async ({ path, method, route }) => {
    if (path === '/api/v1/auth/refresh') {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 40));
      token = 'tab-session-' + String(++rotations);
      await route.fulfill({ json: apiEnvelope({ accessToken: token }) });
      inFlight--;
      return true;
    }
    if (method === 'GET' && !path.includes('/public/') && path.startsWith('/api/v1/')) {
      const authorization = route.request().headers()['authorization'];
      if (authorization !== 'Bearer ' + token) {
        await route.fulfill({
          status: 401,
          json: {
            code: 'UNAUTHENTICATED',
            translationKey: 'error.unauthenticated',
            translationParams: {},
            data: null,
          },
        });
        return true;
      }
      headers.push(authorization);
    }
    return false;
  };
  return { handler, headers, rotations: () => rotations, maxInFlight: () => maxInFlight };
}
async function install(page: Page, handler: ApiScenarioHandler) {
  await installApiScenario(page, { profile: 'root', sites: [alpha, beta], handlers: [handler] });
}
test('a selected site is inherited by a new tab and changes synchronize both ways without stale dialogs', async ({
  page,
  context,
}) => {
  const session = sessionScenario();
  await install(page, session.handler);
  await page.goto('/portfolio');
  await page
    .locator('.site-card')
    .filter({ hasText: 'Site E2E Alpha' })
    .getByRole('button', { name: /travailler sur ce site/i })
    .click();
  await page.goto('/desk');
  await expect(page.locator('.topbar')).toContainText('Site E2E Alpha');
  await page.getByRole('button', { name: /cr.er un ticket/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const second = await context.newPage();
  await install(second, session.handler);
  await second.goto('/desk');
  await expect(second.locator('.topbar')).toContainText('Site E2E Alpha');
  await expect(second.getByRole('heading', { name: /choisissez un site actif/i })).toHaveCount(0);
  await second.goto('/portfolio');
  await second
    .locator('.site-card')
    .filter({ hasText: 'Site E2E Beta' })
    .getByRole('button', { name: /travailler sur ce site/i })
    .click();
  await expect(page.locator('.topbar')).toContainText('Site E2E Beta');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.app-error-boundary')).toHaveCount(0);
  const before = session.rotations();
  await page
    .getByRole('button', { name: /actualiser/i })
    .first()
    .click();
  await expect.poll(() => session.headers.length).toBeGreaterThan(2);
  expect(session.rotations()).toBe(before);
  await page.reload();
  await expect(page.locator('.topbar')).toContainText('Site E2E Beta');
  await page.goto('/portfolio');
  await page
    .locator('.site-card')
    .filter({ hasText: 'Site E2E Alpha' })
    .getByRole('button', { name: /travailler sur ce site/i })
    .click();
  await expect(second.locator('.topbar')).toContainText('Site E2E Alpha');
  await page
    .getByRole('button', { name: /d.connexion/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(second).toHaveURL(/\/login$/);
  expect(await second.evaluate(() => localStorage.getItem('dori.activeSiteId'))).toBeNull();
});
test('simultaneous tabs serialize session rotation', async ({ page, context }) => {
  const session = sessionScenario();
  const second = await context.newPage();
  await install(page, session.handler);
  await install(second, session.handler);
  await Promise.all([page.goto('/portfolio'), second.goto('/portfolio')]);
  await expect(page.locator('.site-card')).toHaveCount(2);
  await expect(second.locator('.site-card')).toHaveCount(2);
  expect(session.maxInFlight()).toBe(1);
});

test('the selected site stays isolated on a different browser origin', async ({
  page,
  context,
}) => {
  const firstSession = sessionScenario();
  await install(page, firstSession.handler);
  await page.goto('/portfolio');
  await page
    .locator('.site-card')
    .filter({ hasText: 'Site E2E Alpha' })
    .getByRole('button', { name: /travailler sur ce site/i })
    .click();
  const other = await context.newPage();
  await install(other, sessionScenario().handler);
  await other.goto('http://localhost:4173/portfolio');
  await other
    .locator('.site-card')
    .filter({ hasText: 'Site E2E Beta' })
    .getByRole('button', { name: /travailler sur ce site/i })
    .click();
  await expect(page.locator('.topbar')).toContainText('Site E2E Alpha');
  expect(await page.evaluate(() => localStorage.getItem('dori.activeSiteId'))).toBe(alpha.siteId);
  expect(await other.evaluate(() => localStorage.getItem('dori.activeSiteId'))).toBe(beta.siteId);
});
