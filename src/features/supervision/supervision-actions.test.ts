import { http, HttpResponse } from 'msw';
import {
  notificationsControllerResend,
  notificationsControllerSendManual,
} from '@/api/generated/notifications/notifications';
import { queuesControllerReset } from '@/api/generated/queues/queues';
import { mockServer } from '@/shared/testing/mock-server';

describe('supervision mutations', () => {
  it('only resets the explicitly confirmed queue through its dedicated endpoint', async () => {
    let called = false;
    mockServer.use(
      http.post('http://localhost:3000/api/v1/queues/12/reset', () => {
        called = true;
        return HttpResponse.json({
          code: 'OK',
          translationKey: null,
          translationParams: {},
          data: { queueId: 12, reset: true },
        });
      }),
    );
    await queuesControllerReset(12);
    expect(called).toBe(true);
  });

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
