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
  queueId: 10,
  date,
  slots: [
    { time: '09:00', capacity: 2, booked: 0, available: 2, isAvailable: true },
    { time: '10:00', capacity: 2, booked: 1, available: 1, isAvailable: true },
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
  await page.locator('.calendar-slot-empty').filter({ hasText: '09:00' }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

test('the appointment wizard loads availability and creates the selected civil time', async ({
  page,
}) => {
  const availabilityDates: string[] = [];
  let registrationBody: Record<string, unknown> = {};
  const appointments: ApiScenarioHandler = async ({ method, path, url, route }) => {
    if (method === 'GET' && path === '/api/v1/queues/10/availability') {
      const date = url.searchParams.get('date') ?? '';
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
            tierId: 1,
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
    queueId: 10,
    tierId: 1,
    entryType: 'appointment',
    scheduledTime: '2026-10-05T07:00:00.000Z',
  });
});

test('a slot conflict keeps the wizard open and reloads availability', async ({ page }) => {
  let availabilityCalls = 0;
  const conflict: ApiScenarioHandler = async ({ method, path, url, route }) => {
    if (method === 'GET' && path === '/api/v1/queues/10/availability') {
      availabilityCalls += 1;
      await route.fulfill({ json: apiEnvelope(availability(url.searchParams.get('date') ?? '')) });
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

test('an existing calendar appointment can be opened, rescheduled and cancelled', async ({
  page,
}) => {
  const appointment = buildAppointment({
    scheduledTime: '2026-10-09T07:00:00.000Z',
    businessDate: '2026-10-09',
    registrationTrackingToken: 'appointment-existing-e2e',
    createdAt: '2026-10-08T10:00:00Z',
    updatedAt: '2026-10-08T10:00:00Z',
    tierId: 1,
  });
  let rescheduleBody: Record<string, unknown> = {};
  let cancelCalls = 0;
  const existing: ApiScenarioHandler = async ({ method, path, url, route }) => {
    if (method === 'GET' && path === '/api/v1/registrations') {
      const items = url.searchParams.get('businessDate') === '2026-10-09' ? [appointment] : [];
      await route.fulfill({ json: apiEnvelope(paginated(items)) });
      return true;
    }
    if (method === 'GET' && path === '/api/v1/registrations/501') {
      await route.fulfill({ json: apiEnvelope(appointment) });
      return true;
    }
    if (method === 'GET' && path === '/api/v1/persons/100') {
      await route.fulfill({ json: apiEnvelope(buildPerson()) });
      return true;
    }
    if (method === 'GET' && path === '/api/v1/queues/10/availability') {
      await route.fulfill({ json: apiEnvelope(availability(url.searchParams.get('date') ?? '')) });
      return true;
    }
    if (method === 'POST' && path === '/api/v1/registrations/501/reschedule') {
      rescheduleBody = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({ json: apiEnvelope(appointment) });
      return true;
    }
    if (method === 'DELETE' && path === '/api/v1/registrations/501') {
      cancelCalls += 1;
      await route.fulfill({ json: apiEnvelope({ registrationId: 501, deleted: true }) });
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
  await page.getByRole('button', { name: /personne test.*R001/i }).click();
  await expect(page.getByRole('dialog', { name: /rendez-vous R001/i })).toBeVisible();
  await page.getByLabel(/reprogrammer/i).fill('2026-10-10T10:00');
  await page.getByRole('button', { name: /^reprogrammer$/i }).click();
  await expect.poll(() => Object.keys(rescheduleBody).length).toBeGreaterThan(0);
  expect(rescheduleBody).toEqual({ scheduledTime: '2026-10-10T08:00:00.000Z' });

  await page.getByRole('button', { name: /personne test.*R001/i }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: /annuler le rendez-vous/i }).click();
  await expect.poll(() => cancelCalls).toBe(1);
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
