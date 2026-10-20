import { http, HttpResponse } from 'msw';
import {
  notificationsControllerResend,
  notificationsControllerSendManual,
} from '@/api/generated/notifications/notifications';
import { mockServer } from '@/shared/testing/mock-server';

describe('notification mutations', () => {
  it('sends the selected registration id, never a person id', async () => {
    let body: unknown;
    mockServer.use(
      http.post('http://localhost:3000/api/v1/notifications', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(
          { code: 'OK', translationKey: null, translationParams: {}, data: { notificationId: 4 } },
          { status: 201 },
        );
      }),
    );
    await notificationsControllerSendManual({
      registrationId: 42,
      channel: 'sms',
      content: 'Votre passage approche.',
    });
    expect(body).toEqual({
      registrationId: 42,
      channel: 'sms',
      content: 'Votre passage approche.',
    });
    expect(body).not.toHaveProperty('personId');
  });

  it('uses the dedicated resend endpoint', async () => {
    let called = false;
    mockServer.use(
      http.post('http://localhost:3000/api/v1/notifications/7/resend', () => {
        called = true;
        return HttpResponse.json({
          code: 'OK',
          translationKey: null,
          translationParams: {},
          data: { notificationId: 7 },
        });
      }),
    );
    await notificationsControllerResend(7);
    expect(called).toBe(true);
  });
});
