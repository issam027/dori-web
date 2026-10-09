import { expect, test } from '@playwright/test';
import {
  apiEnvelope,
  buildSite,
  installApiScenario,
  type ApiScenarioHandler,
} from './support/scenario-fixtures';

const singleSite = [buildSite()];

test('login uses the real form flow and redirects to the first authorized route', async ({ page }) => {
  let loggedIn = false;
  const anonymousUntilLogin: ApiScenarioHandler = async ({ method, path, route }) => {
    if (method === 'POST' && path.endsWith('/auth/login')) {
      loggedIn = true;
      await route.fulfill({ json: apiEnvelope({ accessToken: 'e2e-login-token', user: {} }) });
      return true;
    }
    if (!loggedIn && path.endsWith('/auth/me')) {
      await route.fulfill({ status: 401, json: { code: 'UNAUTHORIZED', translationParams: {} } });
      return true;
    }
    return false;
  };
  await installApiScenario(page, {
    profile: 'operator',
    sites: singleSite,
    handlers: [anonymousUntilLogin],
  });
  await page.goto('/login');
  await page.getByRole('textbox', { name: /email ou nom utilisateur/i }).fill('operator.e2e');
  await page.getByLabel(/mot de passe/i).fill('Root@123456');
  await page.getByRole('button', { name: /se connecter/i }).click();
  await expect(page).toHaveURL(/\/portfolio$/);
  await expect(page.getByRole('main').getByRole('heading', { name: /portefeuille/i })).toBeVisible();
});

test('refreshing a private route restores session and active single-site context', async ({ page }) => {
  let meCalls = 0;
  const countMe: ApiScenarioHandler = ({ path }) => {
    if (path.endsWith('/auth/me')) meCalls += 1;
    return false;
  };
  await installApiScenario(page, {
    profile: 'operator',
    sites: singleSite,
    handlers: [countMe],
  });
  await page.goto('/desk');
  await expect(page.getByText('Site E2E Alpha').first()).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/\/desk$/);
  await expect(page.getByText('Site E2E Alpha').first()).toBeVisible();
  expect(meCalls).toBeGreaterThanOrEqual(2);
});

test('an expired server session returns to login without losing the application error context', async ({
  page,
}) => {
  const expireSession: ApiScenarioHandler = async ({ path, route }) => {
    if (!path.endsWith('/auth/me')) return false;
    await route.fulfill({
      status: 401,
      json: {
        code: 'SESSION_EXPIRED',
        translationKey: 'apiErrors.SESSION_EXPIRED',
        translationParams: {},
        correlationId: 'e2e-session-expired',
      },
    });
    return true;
  };
  await installApiScenario(page, { handlers: [expireSession] });
  await page.goto('/desk');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: /bienvenue/i })).toBeVisible();
  await expect(page.locator('body')).not.toHaveText(/une erreur inattendue est survenue/i);
});

test('logout clears the private shell and returns to login', async ({ page }) => {
  await installApiScenario(page, { profile: 'operator', sites: singleSite });
  await page.goto('/desk');
  await expect(page.getByRole('banner')).toBeVisible();
  await page.getByRole('button', { name: /déconnexion/i }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: /bienvenue/i })).toBeVisible();
});

test('a user required to change password is redirected before business routes', async ({ page }) => {
  await installApiScenario(page, {
    profile: 'operator',
    sites: singleSite,
    userOverrides: { mustChangePassword: true },
  });
  await page.goto('/desk');
  await expect(page).toHaveURL(/\/change-password$/);
  await expect(page.getByRole('heading', { name: /mot de passe/i })).toBeVisible();
});

test('the hidden deco flag logs out each technical device surface', async ({ page }) => {
  let logoutCalls = 0;
  const observeLogout: ApiScenarioHandler = async ({ method, path, route }) => {
    if (method !== 'POST' || !path.endsWith('/auth/logout')) return false;
    logoutCalls += 1;
    await route.fulfill({ json: apiEnvelope({}) });
    return true;
  };
  await installApiScenario(page, {
    profile: 'kiosk',
    sites: singleSite,
    handlers: [observeLogout],
  });
  for (const path of ['/kiosk', '/display', '/track']) {
    await page.goto(`${path}?deco=true`);
    await expect.poll(() => logoutCalls).toBeGreaterThanOrEqual(1);
    await expect(page).toHaveURL(/\/login$/);
  }
  expect(logoutCalls).toBe(3);
});
