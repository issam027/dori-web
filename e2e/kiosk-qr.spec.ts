import { expect, test } from '@playwright/test';

const envelope = (data: unknown) => ({
  code: 'OK',
  translationKey: null,
  translationParams: {},
  data,
});

test('shows a real tracking QR on the kiosk ticket', async ({ page }, testInfo) => {
  await page.context().addInitScript(() => {
    (globalThis as unknown as { print: () => void }).print = () => undefined;
  });
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname.endsWith('/auth/me')) {
      await route.fulfill({
        json: envelope({
          userId: '00000000-0000-4000-8000-000000000007',
          username: 'kiosk',
          userType: 'kiosk',
          roles: ['kiosk'],
          permissions: [],
          mustChangePassword: false,
          languagePreference: 'fr',
          scope: {
            isGlobal: false,
            siteIds: ['00000000-0000-4000-8000-000000000001'],
            queueIds: ['00000000-0000-4000-8000-000000000001'],
          },
        }),
      });
      return;
    }
    if (pathname.endsWith('/queues/00000000-0000-4000-8000-000000000001/status')) {
      await route.fulfill({
        json: envelope({
          queueId: '00000000-0000-4000-8000-000000000001',
          waitingCount: 2,
          activeThreads: 1,
          estimatedWaitMinutes: 8,
          nextAppointments: [],
        }),
      });
      return;
    }
    if (
      pathname.endsWith(
        '/queues/00000000-0000-4000-8000-000000000001/tiers/00000000-0000-4000-8000-000000000001/notification-rules',
      )
    ) {
      await route.fulfill({
        json: envelope({ page: 1, pageSize: 100, total: 0, totalPages: 0, items: [] }),
      });
      return;
    }
    if (pathname.endsWith('/queues/00000000-0000-4000-8000-000000000001/tiers')) {
      await route.fulfill({
        json: envelope({
          page: 1,
          pageSize: 100,
          total: 1,
          totalPages: 1,
          items: [
            {
              queueId: '00000000-0000-4000-8000-000000000001',
              tierId: '00000000-0000-4000-8000-000000000001',
              price: 0,
              currency: 'EUR',
              currencyOverride: null,
              currencyOrigin: 'site',
              isActive: true,
              isDefault: true,
              displayOrder: 0,
              tier: {
                tierId: '00000000-0000-4000-8000-000000000001',
                tierCode: 'standard',
                tierName: 'Standard',
                isSystem: false,
                description: 'Accueil standard',
                isActive: true,
              },
            },
          ],
        }),
      });
      return;
    }
    if (pathname.endsWith('/queues')) {
      await route.fulfill({
        json: envelope({
          page: 1,
          pageSize: 100,
          total: 1,
          totalPages: 1,
          items: [
            {
              queueId: '00000000-0000-4000-8000-000000000001',
              queueCode: 'ACCUEIL',
              siteId: '00000000-0000-4000-8000-000000000001',
              queueName: 'Accueil général',
              averageWaitTime: 8,
              threadCount: 1,
              currency: 'EUR',
              locale: 'fr',
              appointmentsEnabled: true,
              appointmentSlotDuration: 15,
              slotCapacity: 1,
              workingHoursStart: '08:00:00',
              workingHoursEnd: '17:00:00',
              lateToleranceMinutes: 15,
              baseWeightWalkin: 0,
              baseWeightAppointment: 60,
              escalationRateWalkin: 1,
              escalationRateAppointment: 1,
              carryOverWaiting: false,
              dailyResetMode: 'close_all',
              dailyResetTime: '03:00:00',
              configOrigins: {},
              isActive: true,
              createdAt: '2026-10-11T08:00:00Z',
              updatedAt: '2026-10-11T08:00:00Z',
            },
          ],
        }),
      });
      return;
    }
    if (pathname.endsWith('/registrations') && request.method() === 'POST') {
      await route.fulfill({
        status: 201,
        json: envelope({
          registrationId: '00000000-0000-4000-8000-000000000081',
          ticketNumber: 'AG081',
          businessDate: '2026-10-11',
          entryType: 'walkin',
          status: 'waiting',
          tier: {},
          priorityReferenceTime: '2026-10-11T08:00:00Z',
          registrationTrackingToken: 'visual-qr-token',
        }),
      });
      return;
    }
    await route.fulfill({ status: 404, json: envelope(null) });
  });

  await page.goto('/kiosk');
  await page.locator('.kiosk-choices button').first().click();
  await page.locator('.kiosk-tiles button').first().click();
  await page.locator('.kiosk-actions .primary').click();
  await page.locator('input[autocomplete="family-name"]').fill('Martin');
  await page.getByRole('textbox', { name: /téléphone/i }).fill('612345678');
  await page.locator('.kiosk-actions .primary').click();
  await page.locator('.kiosk-tier-tiles button').first().click();
  await page.locator('.kiosk-actions .primary').click();
  await page.locator('.kiosk-actions .primary').click();

  const qr = page.locator('.kiosk-ticket-result img.tracking-qr-image');
  await expect(qr).toBeVisible();
  expect((await qr.boundingBox())?.width).toBeGreaterThan(100);
  await expect(qr).toHaveJSProperty('complete', true);
  expect(
    await qr.evaluate((image) => (image as { naturalWidth: number }).naturalWidth),
  ).toBeGreaterThan(100);
  await expect(page.locator('.kiosk-ticket-result .tracking-qr-logo')).toContainText('DORIFY');
  await page.screenshot({ path: testInfo.outputPath('kiosk-ticket-with-qr.png'), fullPage: true });

  await page.getByRole('button', { name: /imprimer mon ticket/i }).click();
  await expect(page.locator('body')).toHaveAttribute('data-print-kiosk-ticket', 'true');
  await page.emulateMedia({ media: 'print' });
  const printable = page.locator('body > .kiosk-ticket-print-document');
  await expect(printable).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('kiosk-ticket-print.png'),
    fullPage: true,
  });
});
