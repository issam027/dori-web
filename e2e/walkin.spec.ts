import { expect, test, type Page } from '@playwright/test';
import {
  apiEnvelope,
  apiFailure,
  buildPerson,
  buildRegistration,
  buildSite,
  installApiScenario,
  paginated,
  type ApiScenarioHandler,
} from './support/scenario-fixtures';

async function openNewPersonStep(page: Page) {
  await page.goto('/desk');
  await page.getByRole('button', { name: /créer un ticket/i }).click();
  await page.getByRole('button', { name: /nouvelle personne/i }).click();
}

async function fillRequiredIdentity(page: Page) {
  await page.getByRole('textbox', { name: /^nom/i }).fill('Martin');
  await page.getByRole('textbox', { name: /téléphone/i }).fill('+33612345678');
}

async function reachTicketConfirmation(page: Page) {
  await page.getByRole('button', { name: /continuer vers le ticket/i }).click();
  await page.getByLabel(/^file/i).selectOption({ label: 'Accueil E2E' });
  await page.getByLabel(/forfait/i).selectOption({ label: 'Standard E2E' });
}

test('known-person search starts at three characters and exposes five-result pagination', async ({
  page,
}) => {
  const searches: URL[] = [];
  let registrationBody: Record<string, unknown> = {};
  const searchPeople: ApiScenarioHandler = async ({ method, path, url, route }) => {
    if (method === 'POST' && path === '/api/v1/registrations') {
      registrationBody = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        json: apiEnvelope(
          buildRegistration({
            personId: 20,
            registrationTrackingToken: 'known-person-e2e',
            businessDate: '2026-10-09',
            createdAt: '2026-10-09T10:00:00Z',
            updatedAt: '2026-10-09T10:00:00Z',
            tierId: 1,
          }),
        ),
      });
      return true;
    }
    if (path !== '/api/v1/persons') return false;
    searches.push(url);
    const currentPage = Number(url.searchParams.get('page')) || 1;
    await route.fulfill({
      json: apiEnvelope(
        {
          ...paginated(
            Array.from({ length: currentPage === 1 ? 5 : 1 }, (_, index) =>
            buildPerson({
              personId: currentPage * 10 + index,
              firstName: `Personne${String(index + 1)}`,
            }),
            ),
            currentPage,
            5,
          ),
          total: 6,
          totalPages: 2,
        },
      ),
    });
    return true;
  };
  await installApiScenario(page, {
    profile: 'operator',
    sites: [buildSite()],
    handlers: [searchPeople],
  });
  await page.goto('/desk');
  await page.getByRole('button', { name: /créer un ticket/i }).click();
  const search = page.getByRole('textbox', { name: /rechercher une personne/i });
  await search.fill('ma');
  await expect.poll(() => searches.length).toBe(0);
  await search.fill('mar');
  await expect.poll(() => searches.length).toBe(1);
  expect(searches[0]?.searchParams.get('siteId')).toBe('1');
  expect(searches[0]?.searchParams.get('pageSize')).toBe('5');
  await expect(page.getByRole('option')).toHaveCount(5);
  await page.getByRole('button', { name: /suivant/i }).click();
  await expect.poll(() => searches.length).toBe(2);
  expect(searches[1]?.searchParams.get('page')).toBe('2');
  await page.getByRole('option').click();
  await reachTicketConfirmation(page);
  await page.getByRole('button', { name: /créer le ticket/i }).click();
  await expect(page.getByText('E001', { exact: true })).toBeVisible();
  expect(registrationBody).toMatchObject({ personId: 20, queueId: 10, tierId: 1 });
});

test('new-person walk-in sends every identity field once and refreshes operational data', async ({
  page,
}) => {
  let registrationCalls = 0;
  let registrationBody: Record<string, unknown> = {};
  let statusRefreshes = 0;
  const register: ApiScenarioHandler = async ({ method, path, route }) => {
    if (method === 'GET' && /^\/api\/v1\/queues\/\d+\/status$/.test(path))
      statusRefreshes += 1;
    if (method !== 'POST' || path !== '/api/v1/registrations') return false;
    registrationCalls += 1;
    registrationBody = route.request().postDataJSON() as Record<string, unknown>;
    await new Promise((resolve) => setTimeout(resolve, 150));
    await route.fulfill({
      json: apiEnvelope(
        buildRegistration({
          registrationTrackingToken: 'tracking-e2e-only',
          businessDate: '2026-10-09',
          createdAt: '2026-10-09T10:00:00Z',
          updatedAt: '2026-10-09T10:00:00Z',
          tierId: 1,
        }),
      ),
    });
    return true;
  };
  await installApiScenario(page, {
    profile: 'operator',
    sites: [buildSite()],
    handlers: [register],
  });
  await openNewPersonStep(page);
  await fillRequiredIdentity(page);
  await page.getByRole('textbox', { name: /prénom/i }).fill('Alice');
  await page.getByRole('textbox', { name: /adresse e-mail/i }).fill('alice@test.example');
  await page.getByLabel(/date de naissance/i).fill('1992-04-15');
  await page.getByRole('combobox', { name: /langue préférée/i }).selectOption('en');
  await reachTicketConfirmation(page);

  const submit = page.getByRole('button', { name: /créer le ticket/i });
  await submit.evaluate((button: { click(): void }) => {
    button.click();
    button.click();
  });
  await expect(page.getByText('E001', { exact: true })).toBeVisible();
  expect(registrationCalls).toBe(1);
  expect(registrationBody).toMatchObject({
    queueId: 10,
    tierId: 1,
    entryType: 'walkin',
    person: {
      lastName: 'Martin',
      firstName: 'Alice',
      phoneNumber: '+33612345678',
      email: 'alice@test.example',
      birthDate: '1992-04-15',
      languagePreference: 'en',
    },
  });
  await expect(page.getByText(/ticket E001/i)).toBeVisible();
  expect(statusRefreshes).toBeGreaterThanOrEqual(4);
});

test('a registration conflict stays in context and gives an actionable notification', async ({
  page,
}) => {
  const conflict: ApiScenarioHandler = async ({ method, path, route }) => {
    if (method !== 'POST' || path !== '/api/v1/registrations') return false;
    await route.fulfill(apiFailure(409, 'PHONE_ALREADY_USED'));
    return true;
  };
  await installApiScenario(page, {
    profile: 'operator',
    sites: [buildSite()],
    handlers: [conflict],
  });
  await openNewPersonStep(page);
  await fillRequiredIdentity(page);
  await reachTicketConfirmation(page);
  await page.getByRole('button', { name: /créer le ticket/i }).click();

  await expect(page.getByText(/données à actualiser/i)).toBeVisible();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page).toHaveURL(/\/desk$/);
});
