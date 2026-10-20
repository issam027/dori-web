import { http, HttpResponse } from 'msw';
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
});
