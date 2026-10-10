import { http, HttpResponse } from 'msw';
import { mockServer } from '@/shared/testing/mock-server';
import { callNextAndCommit } from './operation-actions';
import { useOperationStore } from './operation-store';

afterEach(() => {
  useOperationStore.getState().reset();
});

it('commits an irreversible call only after server confirmation', async () => {
  let confirm!: () => void;
  const gate = new Promise<void>((resolve) => {
    confirm = resolve;
  });
  mockServer.use(
    http.post('http://localhost:3000/api/v1/queues/4/next', async () => {
      await gate;
      return HttpResponse.json({
        code: 'OK',
        translationKey: null,
        translationParams: {},
        data: {
          registrationId: 9,
          ticketNumber: 'A009',
          entryType: 'walkin',
          calledEarly: false,
          tier: {},
          status: 'called',
          sessionId: 2,
          threadNumber: 1,
          priorityScore: 1,
          calledAt: '2026-10-08T08:00:00Z',
          person: {},
        },
      });
    }),
  );
  const request = callNextAndCommit(4);
  expect(useOperationStore.getState().activeCall).toBeNull();
  confirm();
  await expect(request).resolves.toBe('called');
  expect(useOperationStore.getState().activeCall?.registrationId).toBe(9);
});

it('treats an empty queue as a normal outcome and keeps local state unchanged', async () => {
  mockServer.use(
    http.post('http://localhost:3000/api/v1/queues/4/next', () =>
      HttpResponse.json({
        code: 'QUEUE_EMPTY',
        translationKey: 'queue.next.empty',
        translationParams: {},
        data: null,
      }),
    ),
  );

  await expect(callNextAndCommit(4)).resolves.toBe('empty');
  expect(useOperationStore.getState().activeCall).toBeNull();
});

it('keeps local state unchanged on a 409 conflict', async () => {
  mockServer.use(
    http.post('http://localhost:3000/api/v1/queues/4/next', () =>
      HttpResponse.json(
        {
          code: 'QUEUE_CONFLICT',
          translationKey: 'errors.conflict',
          translationParams: {},
          data: null,
        },
        { status: 409 },
      ),
    ),
  );
  await expect(callNextAndCommit(4)).rejects.toMatchObject({ status: 409 });
  expect(useOperationStore.getState().activeCall).toBeNull();
});
