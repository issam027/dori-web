import { expect, test } from '@playwright/test';
import { apiEnvelope, buildSite, buildUser, installApiScenario } from './support/scenario-fixtures';

for (const { width, profile, destination, siteCount } of [
  { width: 390, profile: 'operator', destination: '/desk', siteCount: 1 },
  { width: 1440, profile: 'operator', destination: '/desk', siteCount: 1 },
  { width: 1440, profile: 'root', destination: '/portfolio', siteCount: 2 },
  { width: 1440, profile: 'root', destination: '/desk', siteCount: 1 },
] as const) {
  test(`forced password change signs out then returns to the cockpit for ${profile}/${String(siteCount)} at ${String(width)}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    let required = true;
    let profileReads = 0;
    await installApiScenario(page, {
      profile,
      sites: siteCount === 1 ? [buildSite()] : undefined,
      handlers: [
        async ({ path, route }) => {
          if (path === '/api/v1/auth/me') {
            profileReads++;
            await route.fulfill({
              json: apiEnvelope(
                buildUser(profile, {
                  mustChangePassword: required,
                  languagePreference: required ? 'fr' : 'en',
                }),
              ),
            });
            return true;
          }
          if (path === '/api/v1/auth/password/change') {
            required = false;
            await route.fulfill({ json: apiEnvelope({ success: true }) });
            return true;
          }
          if (path === '/api/v1/auth/login') {
            await route.fulfill({
              json: apiEnvelope({
                accessToken: 'new-session-token',
                user: buildUser(profile, { languagePreference: 'en' }),
              }),
            });
            return true;
          }
          return false;
        },
      ],
    });
    await page.goto('/desk');
    await expect(page).toHaveURL(/\/change-password$/);
    await expect(page.locator('.password-change-card')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByLabel(/^Mot de passe actuel/).fill('OldPassword123!');
    await page.getByLabel(/^Nouveau mot de passe/).fill('NewPassword123!');
    await page.getByLabel(/^Confirmation/).fill('NewPassword123!');
    await page.screenshot({ path: test.info().outputPath('password-page.png'), fullPage: true });
    const reads = profileReads;
    await page.getByRole('button', { name: 'Enregistrer et me reconnecter' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('status')).toContainText('Mot de passe modifié');
    expect(profileReads).toBe(reads);
    await page.getByLabel('Email ou nom utilisateur').fill('operator.e2e');
    await page.getByLabel(/^Mot de passe/).fill('NewPassword123!');
    await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe(destination);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
}

for (const mode of ['kiosk', 'display']) {
  test(`${mode} uses the site language instead of the user language`, async ({ page }) => {
    await installApiScenario(page, {
      profile: 'kiosk',
      userOverrides: { languagePreference: 'en' },
      sites: [buildSite({ defaultLocale: 'ar-TN' })],
    });
    await page.goto(`/${mode}`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar-TN');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  });
}

test('tracking chooses the registration language over the signed-in user language', async ({
  page,
}) => {
  await installApiScenario(page, {
    userOverrides: { languagePreference: 'en' },
    handlers: [
      async ({ path, route }) => {
        if (path !== '/api/v1/public/registrations/position') return false;
        await route.fulfill({
          json: apiEnvelope({
            status: 'waiting',
            registrationStatus: 'waiting',
            ticketNumber: 'T00001',
            position: 8,
            estimatedWaitMinutes: 10,
            queueId: '00000000-0000-4000-8000-000000000010',
            languagePreference: 'ar',
          }),
        });
        return true;
      },
    ],
  });
  await page.goto('/track?token=550e8400-e29b-41d4-a716-446655440000');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
});

test('a voluntary password change from the profile also finishes on the sign-in screen', async ({
  page,
}) => {
  await installApiScenario(page, {
    profile: 'operator',
    sites: [buildSite()],
    handlers: [
      async ({ path, route }) => {
        if (path !== '/api/v1/auth/password/change') return false;
        await route.fulfill({ json: apiEnvelope({ success: true }) });
        return true;
      },
    ],
  });
  await page.goto('/profile');
  await page.getByRole('button', { name: /changer mon mot de passe/i }).click();
  const editor = page.locator('.profile-password-editor');
  await editor.getByLabel(/^Mot de passe actuel/).fill('OldPassword123!');
  await editor.getByLabel(/^Nouveau mot de passe/).fill('NewPassword123!');
  await editor.getByLabel(/confirmation/i).fill('NewPassword123!');
  await editor.getByRole('button', { name: /jour le mot de passe/i }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('status')).toContainText('Mot de passe');
});
