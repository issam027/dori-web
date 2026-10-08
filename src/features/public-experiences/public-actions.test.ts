import { http, HttpResponse } from 'msw';
import {
  registrationsControllerCheckIn,
  registrationsControllerGetPublicPosition,
  registrationsControllerLookup,
  registrationsControllerRegister,
} from '@/api/generated/registrations/registrations';
import { mockServer } from '@/shared/testing/mock-server';

describe('specialized public flows', () => {
  it('registers a kiosk walk-in with API-confirmed identity, queue and tier', async () => {
    let body: unknown;
    mockServer.use(
      http.post('http://localhost:3000/api/v1/registrations', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(
          {
            code: 'OK',
            translationKey: null,
            translationParams: {},
            data: {
              registrationId: 8,
              ticketNumber: 'A008',
              businessDate: '2026-10-08',
              entryType: 'walkin',
              status: 'waiting',
              tier: {},
              priorityReferenceTime: '2026-10-08T08:00:00Z',
              trackingUrl: 'https://dori.test/track?token=opaque',
            },
          },
          { status: 201 },
        );
      }),
    );
    await registrationsControllerRegister({
      queueId: 4,
      tierId: 2,
      entryType: 'walkin',
      person: { lastName: 'Test', phoneNumber: '+33612345678' },
    });
    expect(body).toMatchObject({ queueId: 4, tierId: 2, entryType: 'walkin' });
  });

  it('looks up and checks in an appointment without exposing cancellation', async () => {
    let checkedIn = false;
    const registration = {
      registrationId: 7,
      queueId: 4,
      personId: 9,
      ticketNumber: 'A007',
      entryType: 'appointment',
      status: 'scheduled',
      businessDate: '2026-10-08',
      registrationTrackingToken: 'opaque',
      tierId: 2,
      createdAt: '2026-10-08T08:00:00Z',
      updatedAt: '2026-10-08T08:00:00Z',
    };
    mockServer.use(
      http.get('http://localhost:3000/api/v1/registrations/lookup', () =>
        HttpResponse.json({
          code: 'OK',
          translationKey: null,
          translationParams: {},
          data: registration,
        }),
      ),
      http.post('http://localhost:3000/api/v1/registrations/7/check-in', () => {
        checkedIn = true;
        return HttpResponse.json({
          code: 'OK',
          translationKey: null,
          translationParams: {},
          data: { ...registration, status: 'waiting' },
        });
      }),
    );
    const found = await registrationsControllerLookup({ ticketNumber: 'A007' });
    await registrationsControllerCheckIn(found.data.registrationId);
    expect(checkedIn).toBe(true);
  });

  it('sends the opaque tracking token only in the dedicated header', async () => {
    let token: string | null = null;
    mockServer.use(
      http.get('http://localhost:3000/api/v1/public/registrations/position', ({ request }) => {
        token = request.headers.get('X-Registration-Token');
        return HttpResponse.json({
          code: 'OK',
          translationKey: null,
          translationParams: {},
          data: {
            ticketNumber: 'A008',
            position: 2,
            estimatedWaitMinutes: 8,
            status: 'waiting',
            queueName: 'Accueil',
          },
        });
      }),
    );
    await registrationsControllerGetPublicPosition({
      headers: { 'X-Registration-Token': 'opaque-secret' },
    });
    expect(token).toBe('opaque-secret');
  });
});
