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
          {
            code: 'OK',
            translationKey: null,
            translationParams: {},
            data: { notificationId: '00000000-0000-4000-8000-000000000004' },
          },
          { status: 201 },
        );
      }),
    );
    await notificationsControllerSendManual({
      registrationId: '00000000-0000-4000-8000-000000000042',
      channel: 'sms',
      content: 'Votre passage approche.',
    });
    expect(body).toEqual({
      registrationId: '00000000-0000-4000-8000-000000000042',
      channel: 'sms',
      content: 'Votre passage approche.',
    });
    expect(body).not.toHaveProperty('personId');
  });

  it('uses the dedicated resend endpoint', async () => {
    let called = false;
    mockServer.use(
      http.post(
        'http://localhost:3000/api/v1/notifications/00000000-0000-4000-8000-000000000007/resend',
        () => {
          called = true;
          return HttpResponse.json({
            code: 'OK',
            translationKey: null,
            translationParams: {},
            data: { notificationId: '00000000-0000-4000-8000-000000000007' },
          });
        },
      ),
    );
    await notificationsControllerResend('00000000-0000-4000-8000-000000000007');
    expect(called).toBe(true);
  });
});
