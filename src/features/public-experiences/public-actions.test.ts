import { http, HttpResponse } from 'msw';
import {
  registrationsControllerCheckIn,
  registrationsControllerGetPublicPosition,
  registrationsControllerLookup,
  registrationsControllerRegister,
} from '@/api/generated/registrations/registrations';
import { mockServer } from '@/shared/testing/mock-server';

describe('specialized public flows', () => {
  it('registers a kiosk walk-in and receives its tracking token directly', async () => {
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
              registrationId: '00000000-0000-4000-8000-000000000008',
              ticketNumber: 'A008',
              businessDate: '2026-10-08',
              entryType: 'walkin',
              status: 'waiting',
              tier: {},
              priorityReferenceTime: '2026-10-08T08:00:00Z',
              registrationTrackingToken: 'opaque',
              registrationTrackingTokenValidUntil: '2026-10-09T08:00:00Z',
            },
          },
          { status: 201 },
        );
      }),
    );
    const response = await registrationsControllerRegister({
      queueId: '00000000-0000-4000-8000-000000000004',
      tierId: '00000000-0000-4000-8000-000000000002',
      entryType: 'walkin',
      person: { lastName: 'Test', phoneNumber: '+33612345678' },
    });
    expect(body).toMatchObject({
      queueId: '00000000-0000-4000-8000-000000000004',
      tierId: '00000000-0000-4000-8000-000000000002',
      entryType: 'walkin',
    });
    expect(response.data.registrationTrackingToken).toBe('opaque');
  });

  it('looks up and checks in an appointment', async () => {
    let checkedIn = false;
    let lookupPhone: string | null = null;
    const registration = {
      registrationId: '00000000-0000-4000-8000-000000000007',
      queueId: '00000000-0000-4000-8000-000000000004',
      personId: '00000000-0000-4000-8000-000000000009',
      ticketNumber: 'A007',
      entryType: 'appointment',
      status: 'scheduled',
      businessDate: '2026-10-08',
      registrationTrackingToken: 'opaque',
      tierId: '00000000-0000-4000-8000-000000000002',
      createdAt: '2026-10-08T08:00:00Z',
      updatedAt: '2026-10-08T08:00:00Z',
      isActive: true,
    };
    mockServer.use(
      http.get('http://localhost:3000/api/v1/registrations/lookup', ({ request }) => {
        lookupPhone = new URL(request.url).searchParams.get('phoneNumber');
        return HttpResponse.json({
          code: 'OK',
          translationKey: null,
          translationParams: {},
          data: registration,
        });
      }),
      http.post(
        'http://localhost:3000/api/v1/registrations/00000000-0000-4000-8000-000000000007/check-in',
        () => {
          checkedIn = true;
          return HttpResponse.json({
            code: 'OK',
            translationKey: null,
            translationParams: {},
            data: { ...registration, status: 'waiting' },
          });
        },
      ),
    );
    const found = await registrationsControllerLookup({ phoneNumber: '+33612345678' });
    await registrationsControllerCheckIn(found.data.registrationId);
    expect(lookupPhone).toBe('+33612345678');
    expect(checkedIn).toBe(true);
  });

  it('sends the tracking token only in the dedicated header', async () => {
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
