import { http, HttpResponse } from 'msw';
import { queuesControllerReset } from '@/api/generated/queues/queues';
import { mockServer } from '@/shared/testing/mock-server';

describe('supervision mutations', () => {
  it('only resets the explicitly confirmed queue through its dedicated endpoint', async () => {
    let called = false;
    mockServer.use(
      http.post(
        'http://localhost:3000/api/v1/queues/00000000-0000-4000-8000-000000000012/reset',
        () => {
          called = true;
          return HttpResponse.json({
            code: 'OK',
            translationKey: null,
            translationParams: {},
            data: { queueId: '00000000-0000-4000-8000-000000000012', reset: true },
          });
        },
      ),
    );
    await queuesControllerReset('00000000-0000-4000-8000-000000000012');
    expect(called).toBe(true);
  });
});
