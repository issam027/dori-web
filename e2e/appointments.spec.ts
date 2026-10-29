import { expect, test, type Page } from '@playwright/test';
import {
  apiEnvelope,
  apiFailure,
  buildAppointment,
  buildPerson,
  buildQueue,
  buildSite,
  installApiScenario,
  paginated,
  type ApiScenarioHandler,
  useFixedClock,
} from './support/scenario-fixtures';

const site = buildSite({ timezone: 'Europe/Paris' });
const appointmentQueue = buildQueue({
  workingHoursStart: '08:00:00',
  workingHoursEnd: '12:00:00',
  appointmentsEnabled: true,
});

const availability = (date: string) => ({
  queueId: '00000000-0000-4000-8000-000000000010',
  timezone: 'Europe/Paris',
  dateFrom: date,
  dateTo: date,
  days: [
    {
      businessDate: date,
      isOpen: true,
      capacity: 4,
      booked: 1,
      available: 3,
      slots: [
        { time: '09:00', capacity: 2, booked: 0, available: 2, isAvailable: true },
        { time: '10:00', capacity: 2, booked: 1, available: 1, isAvailable: true },
      ],
    },
  ],
});

async function selectNewPerson(page: Page) {
  await page.getByRole('button', { name: /nouvelle personne/i }).click();
  await page.getByRole('textbox', { name: /^nom/i }).fill('Rendezvous');
  await page.getByRole('textbox', { name: /téléphone/i }).fill('+33698765432');
  await page.getByRole('button', { name: /^continuer/i }).click();
  await page.getByLabel(/forfait/i).selectOption({ label: 'Standard E2E' });
}

async function openEmptySlot(page: Page) {
  await page.goto('/appointments');
  await expect(
    page.getByRole('main').getByRole('heading', {
      name: `Rendez-vous — ${appointmentQueue.queueName}`,
    }),
  ).toBeVisible();
  await expect(page.getByRole('combobox', { name: /file/i })).toHaveCount(0);
  await page.locator('.calendar-slot-empty').filter({ hasText: '09:00' }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

test('the current day and time remain visible on desktop and mobile', async ({ page }) => {
  await useFixedClock(page, '2026-10-09T08:15:00Z');
  await installApiScenario(page, {
    profile: 'operator',
    sites: [site],
    queues: [appointmentQueue],
    handlers: [
      async ({ path, url, route }) => {
        if (!/^\/api\/v1\/queues\/[^/]+\/availability$/.test(path)) return false;
        await route.fulfill({
          json: apiEnvelope(availability(url.searchParams.get('dateFrom') ?? '')),
        });
        return true;
      },
    ],
  });

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/appointments');
    await expect(page.locator('.calendar-day.is-today')).toBeVisible();
    await expect(page.locator('.calendar-current-time')).toBeVisible();
    expect(
      await page.evaluate<boolean>(
        'document.documentElement.scrollWidth <= document.documentElement.clientWidth',
      ),
    ).toBe(true);
  }
});

test('the page title follows the selected queue and only shows the selector when useful', async ({
  page,
}) => {
  const secondQueue = buildQueue({
    queueId: '00000000-0000-4000-8000-000000000011',
    queueName: 'Rendez-vous spécialisés',
    appointmentsEnabled: true,
  });
  await installApiScenario(page, {
    profile: 'operator',
    sites: [site],
    queues: [appointmentQueue, secondQueue],
    handlers: [
      async ({ path, url, route }) => {
        if (!/^\/api\/v1\/queues\/[^/]+\/availability$/.test(path)) return false;
        await route.fulfill({
          json: apiEnvelope(availability(url.searchParams.get('dateFrom') ?? '')),
        });
        return true;
      },
    ],
  });

  await page.goto('/appointments');
  const selector = page.getByRole('combobox', { name: /file/i });
  await expect(selector).toBeVisible();
  await expect(
    page
      .getByRole('main')
      .getByRole('heading', { name: `Rendez-vous — ${appointmentQueue.queueName}` }),
  ).toBeVisible();

  await selector.selectOption(secondQueue.queueId);
  await expect(
    page.getByRole('main').getByRole('heading', { name: 'Rendez-vous — Rendez-vous spécialisés' }),
  ).toBeVisible();
  await page.locator('.calendar-day').last().scrollIntoViewIfNeeded();
  await expect(page.locator('.topbar-title-route h1')).toHaveText(
    'Rendez-vous — Rendez-vous spécialisés',
  );
});

test('the appointment wizard loads availability and creates the selected civil time', async ({
  page,
}) => {
  const availabilityDates: string[] = [];
  let registrationBody: Record<string, unknown> = {};
  const appointments: ApiScenarioHandler = async ({ method, path, url, route }) => {
    if (
      method === 'GET' &&
      path === '/api/v1/queues/00000000-0000-4000-8000-000000000010/availability'
    ) {
      const date = url.searchParams.get('dateFrom') ?? '';
      availabilityDates.push(date);
      await route.fulfill({ json: apiEnvelope(availability(date)) });
      return true;
    }
    if (method === 'POST' && path === '/api/v1/registrations') {
      registrationBody = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        json: apiEnvelope(
          buildAppointment({
            registrationTrackingToken: 'appointment-e2e',
            businessDate: '2026-10-05',
            createdAt: '2026-10-09T10:00:00Z',
            updatedAt: '2026-10-09T10:00:00Z',
            tierId: '00000000-0000-4000-8000-000000000001',
          }),
        ),
      });
      return true;
    }
    return false;
  };
  await useFixedClock(page);
  await installApiScenario(page, {
    profile: 'operator',
    sites: [site],
    queues: [appointmentQueue],
    handlers: [appointments],
  });
  await openEmptySlot(page);
  await selectNewPerson(page);
  await expect.poll(() => availabilityDates.length).toBeGreaterThan(0);
  await page.getByRole('button', { name: /créer le rendez-vous/i }).click();
  await expect(page.getByText(/rendez-vous créé/i)).toBeVisible();
  expect(registrationBody).toMatchObject({
    queueId: '00000000-0000-4000-8000-000000000010',
    tierId: '00000000-0000-4000-8000-000000000001',
    entryType: 'appointment',
    scheduledTime: '2026-10-05T07:00:00.000Z',
  });
});

test('a slot conflict keeps the wizard open and reloads availability', async ({ page }) => {
  let availabilityCalls = 0;
  const conflict: ApiScenarioHandler = async ({ method, path, url, route }) => {
    if (
      method === 'GET' &&
      path === '/api/v1/queues/00000000-0000-4000-8000-000000000010/availability'
    ) {
      availabilityCalls += 1;
      await route.fulfill({
        json: apiEnvelope(availability(url.searchParams.get('dateFrom') ?? '')),
      });
      return true;
    }
    if (method === 'POST' && path === '/api/v1/registrations') {
      await route.fulfill(apiFailure(409, 'APPOINTMENT_SLOT_UNAVAILABLE'));
      return true;
    }
    return false;
  };
  await useFixedClock(page);
  await installApiScenario(page, {
    profile: 'operator',
    sites: [site],
    queues: [appointmentQueue],
    handlers: [conflict],
  });
  await openEmptySlot(page);
  await selectNewPerson(page);
  await page.getByRole('button', { name: /créer le rendez-vous/i }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(/créneau/i);
  await expect.poll(() => availabilityCalls).toBeGreaterThanOrEqual(2);
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('an existing calendar appointment can be opened, checked in, rescheduled and cancelled', async ({
  page,
}) => {
  const appointment = buildAppointment({
    scheduledTime: '2026-10-09T07:00:00.000Z',
    businessDate: '2026-10-09',
    registrationTrackingToken: 'appointment-existing-e2e',
    createdAt: '2026-10-08T10:00:00Z',
    updatedAt: '2026-10-08T10:00:00Z',
    tierId: '00000000-0000-4000-8000-000000000001',
    appointmentStatus: 'confirmed',
  });
  let rescheduleBody: Record<string, unknown> = {};
  let cancelCalls = 0;
  let checkInCalls = 0;
  let expectedListQuery = false;
  const noteBodies: string[] = [];
  const existing: ApiScenarioHandler = async ({ method, path, url, route }) => {
    if (method === 'GET' && path === '/api/v1/registrations') {
      if (url.searchParams.get('dateFrom') === '2026-10-05') {
        expectedListQuery =
          url.searchParams.get('page') === '1' &&
          url.searchParams.get('pageSize') === '100' &&
          url.searchParams.get('queueId') === '00000000-0000-4000-8000-000000000010' &&
          url.searchParams.get('entryType') === 'appointment';
      }
      const items = url.searchParams.get('dateFrom') === '2026-10-05' ? [appointment] : [];
      await route.fulfill({ json: apiEnvelope(paginated(items)) });
      return true;
    }
    if (method === 'GET' && path === '/api/v1/registrations/00000000-0000-4000-8000-000000000501') {
      await route.fulfill({ json: apiEnvelope(appointment) });
      return true;
    }
    if (method === 'GET' && path === '/api/v1/persons/00000000-0000-4000-8000-000000000100') {
      await route.fulfill({ json: apiEnvelope(buildPerson()) });
      return true;
    }
    if (
      method === 'GET' &&
      path === '/api/v1/queues/00000000-0000-4000-8000-000000000010/availability'
    ) {
      await route.fulfill({
        json: apiEnvelope(availability(url.searchParams.get('dateFrom') ?? '')),
      });
      return true;
    }
    if (
      method === 'POST' &&
      path === '/api/v1/registrations/00000000-0000-4000-8000-000000000501/reschedule'
    ) {
      rescheduleBody = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({ json: apiEnvelope(appointment) });
      return true;
    }
    if (
      method === 'POST' &&
      path === '/api/v1/registrations/00000000-0000-4000-8000-000000000501/check-in'
    ) {
      checkInCalls += 1;
      await route.fulfill({ json: apiEnvelope(appointment) });
      return true;
    }
    if (
      method === 'POST' &&
      path === '/api/v1/persons/00000000-0000-4000-8000-000000000100/notes'
    ) {
      const body = route.request().postDataJSON() as { content: string };
      noteBodies.push(body.content);
      await route.fulfill({ json: apiEnvelope({ noteId: noteBodies.length, ...body }) });
      return true;
    }
    if (
      method === 'DELETE' &&
      path === '/api/v1/registrations/00000000-0000-4000-8000-000000000501'
    ) {
      cancelCalls += 1;
      await route.fulfill({
        json: apiEnvelope({
          registrationId: '00000000-0000-4000-8000-000000000501',
          deleted: true,
        }),
      });
      return true;
    }
    return false;
  };
  await useFixedClock(page);
  await installApiScenario(page, {
    profile: 'operator',
    sites: [site],
    queues: [appointmentQueue],
    handlers: [existing],
  });
  await page.goto('/appointments');
  await expect.poll(() => expectedListQuery).toBe(true);
  await page.getByRole('button', { name: 'Personne Test', exact: true }).click();
  await expect(page.getByRole('dialog', { name: /rendez-vous R001/i })).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText(/personne test/i);
  await page.getByRole('button', { name: /marquer comme présent/i }).click();
  await expect.poll(() => checkInCalls).toBe(1);
  await page.getByRole('button', { name: /terminer/i }).click();

  await page.getByRole('button', { name: 'Personne Test', exact: true }).click();
  await page.getByRole('button', { name: /^reprogrammer$/i }).click();
  await page.getByLabel(/nouvelle date/i).fill('2026-10-10');
  await page.getByRole('button', { name: /10:00.*1 place/i }).click();
  await page.getByRole('button', { name: /confirmer la reprogrammation/i }).click();
  await expect.poll(() => Object.keys(rescheduleBody).length).toBeGreaterThan(0);
  expect(rescheduleBody).toEqual({ scheduledTime: '2026-10-10T08:00:00.000Z' });
  await expect.poll(() => noteBodies.length).toBe(1);
  expect(noteBodies[0]).toMatch(/reprogrammation.*R001.*2026-10-09.*2026-10-10/i);

  await page.getByRole('button', { name: 'Personne Test', exact: true }).click();
  await page.getByRole('button', { name: /annuler le rendez-vous/i }).click();
  await page.getByLabel(/motif de l’annulation/i).fill('Demande téléphonique du client');
  await page.getByRole('button', { name: /confirmer l’annulation/i }).click();
  await expect.poll(() => cancelCalls).toBe(1);
  await expect.poll(() => noteBodies.length).toBe(2);
  expect(noteBodies[1]).toMatch(/annulation.*R001.*demande téléphonique du client/i);
});

test('a site without appointment-enabled queues explains that appointments are unavailable', async ({
  page,
}) => {
  await installApiScenario(page, {
    profile: 'operator',
    sites: [site],
    queues: [buildQueue({ appointmentsEnabled: false })],
  });
  await page.goto('/appointments');
  await expect(page.getByRole('status')).toContainText(/ne gère pas les rendez-vous/i);
  await expect(page.locator('.week-calendar')).toHaveCount(0);
});

test('the queue calendar renders API-closed days compactly and prevents appointment creation', async ({
  page,
}) => {
  const closedDay: ApiScenarioHandler = async ({ method, path, url, route }) => {
    if (
      method === 'GET' &&
      path === '/api/v1/queues/00000000-0000-4000-8000-000000000010/availability'
    ) {
      const dateFrom = url.searchParams.get('dateFrom') ?? '';
      const dateTo = url.searchParams.get('dateTo') ?? dateFrom;
      await route.fulfill({
        json: apiEnvelope({
          queueId: '00000000-0000-4000-8000-000000000010',
          timezone: 'Europe/Paris',
          dateFrom,
          dateTo,
          days: [
            {
              businessDate: '2026-10-06',
              isOpen: false,
              capacity: 0,
              booked: 0,
              available: 0,
              slots: [],
            },
          ],
        }),
      });
      return true;
    }
    return false;
  };
  await useFixedClock(page);
  await installApiScenario(page, {
    profile: 'operator',
    sites: [site],
    queues: [appointmentQueue],
    handlers: [closedDay],
  });
  await page.goto('/appointments');
  const closed = page.locator('.calendar-day.is-closed').filter({ hasText: '2026-10-06' });
  await expect(closed).toContainText(/ferm/i);
  await expect(closed.locator('.calendar-slot')).toHaveCount(0);
  await closed.click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
