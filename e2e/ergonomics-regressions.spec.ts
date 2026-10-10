import { expect, test } from '@playwright/test';
import { apiEnvelope, buildSite, installApiScenario, paginated } from './support/scenario-fixtures';

test('profile and onboarding columns share the same height and metric cards keep spacing', async ({
  page,
}) => {
  await installApiScenario(page, {
    profile: 'root',
    sites: [buildSite()],
    userOverrides: { languagePreference: 'fr' },
  });
  await page.goto('/profile');
  await expect(page.getByRole('main').getByRole('heading', { name: /mon profil/i })).toBeVisible();
  const profileHeights = await page.evaluate<number[]>(
    "Array.from(document.querySelectorAll('.profile-layout > .card'), card => Math.round(card.getBoundingClientRect().height))",
  );
  expect(profileHeights).toHaveLength(2);
  expect(profileHeights[0]).toBe(profileHeights[1]);
  await expect(page.locator('.profile-scope-metrics > .card').last()).toHaveCSS('gap', /\d+px/);

  await page.goto('/onboarding');
  await expect(
    page.getByRole('main').getByRole('heading', { name: /configurer un nouveau site/i }),
  ).toBeVisible();
  const onboardingHeights = await page.evaluate<number[]>(
    "Array.from(document.querySelectorAll('.onboarding-layout > .card'), card => Math.round(card.getBoundingClientRect().height))",
  );
  expect(onboardingHeights).toHaveLength(2);
  expect(onboardingHeights[0]).toBe(onboardingHeights[1]);
});

test('a draft queue can be reopened and edited from the onboarding table', async ({ page }) => {
  const draft = {
    step: 3,
    site: {
      siteName: 'Site en création',
      siteType: 'public',
      timezone: 'Europe/Paris',
      defaultCurrency: 'EUR',
      defaultLocale: 'fr',
      defaultAppointmentsEnabled: false,
      defaultAppointmentSlotDuration: 15,
      defaultSlotCapacity: 1,
      defaultWorkingHoursStart: '08:00',
      defaultWorkingHoursEnd: '17:00',
      defaultBreakStart: '12:00',
      defaultBreakEnd: '14:00',
      defaultLateToleranceMinutes: 60,
      defaultBaseWeightWalkin: 0,
      defaultBaseWeightAppointment: 60,
      defaultEscalationRateWalkin: 1,
      defaultEscalationRateAppointment: 1,
      defaultCarryOverWaiting: false,
      defaultDailyResetMode: 'close_all',
      defaultDailyResetTime: '03:00',
    },
    confirmedSiteId: 42,
    queues: [
      {
        queueCode: 'ACC',
        queueName: 'Accueil initial',
        averageWaitTime: 10,
        threadCount: 2,
        currency: 'EUR',
        locale: 'fr',
      },
    ],
    confirmedQueueIds: {},
    selectedTierIds: {},
    associatedTierQueueIds: [],
    completedUserIds: [],
    testValidated: false,
  };
  await page.addInitScript((value) => {
    localStorage.setItem('dori:onboarding:v1', JSON.stringify(value));
  }, draft);
  await installApiScenario(page, { profile: 'root', sites: [buildSite()] });
  await page.goto('/onboarding');
  const row = page.getByRole('row').filter({ hasText: 'ACC' });
  await expect(row).toContainText('Accueil initial');
  await expect(row).toContainText('2');
  await row.getByRole('button', { name: /modifier la file accueil initial/i }).click();
  await expect(page.getByRole('dialog', { name: /modifier la file/i })).toBeVisible();
  await page.getByRole('dialog').getByLabel(/^nom$/i).fill('Accueil modifié');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /enregistrer/i })
    .click();
  await expect(row).toContainText('Accueil modifié');
});

test('a root account can assign every role from kiosk through root', async ({ page }) => {
  const roles = [
    { roleId: 1, roleName: 'kiosk', rank: 1, isActive: true, permissions: [] },
    { roleId: 2, roleName: 'hotesse', rank: 2, isActive: true, permissions: [] },
    { roleId: 3, roleName: 'manager', rank: 3, isActive: true, permissions: [] },
    { roleId: 4, roleName: 'admin', rank: 4, isActive: true, permissions: [] },
    { roleId: 5, roleName: 'root', rank: 5, isActive: true, permissions: [] },
  ];
  await installApiScenario(page, {
    profile: 'root',
    sites: [buildSite()],
    handlers: [
      async ({ path, route }) => {
        if (path === '/api/v1/roles') {
          await route.fulfill({ json: apiEnvelope(paginated(roles)) });
          return true;
        }
        if (path === '/api/v1/users') {
          await route.fulfill({ json: apiEnvelope(paginated([])) });
          return true;
        }
        return false;
      },
    ],
  });
  await page.goto('/settings/users');
  await page.getByRole('button', { name: /nouvel utilisateur/i }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(/nom d.utilisateur/i).fill('role-check');
  await dialog.getByRole('button', { name: /suivant/i }).click();
  for (const role of roles) {
    await expect(
      dialog.getByRole('button', { name: new RegExp(`^${role.roleName}`, 'i') }),
    ).toBeVisible();
  }
});
