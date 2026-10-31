import { http, HttpResponse } from 'msw';
import { mockServer } from '@/shared/testing/mock-server';
import { callNextAndCommit } from './operation-actions';
import { useOperationStore } from '@/shared/queue-operations/operation-store';

afterEach(() => {
  useOperationStore.getState().reset();
});

it('commits an irreversible call only after server confirmation', async () => {
  let confirm!: () => void;
  const gate = new Promise<void>((resolve) => {
    confirm = resolve;
  });
  mockServer.use(
    http.post(
      'http://localhost:3000/api/v1/queues/00000000-0000-4000-8000-000000000004/next',
      async () => {
        await gate;
        return HttpResponse.json({
          code: 'OK',
          translationKey: null,
          translationParams: {},
          data: {
            registrationId: '00000000-0000-4000-8000-000000000009',
            ticketNumber: 'A009',
            entryType: 'walkin',
            calledEarly: false,
            tier: {},
            status: 'called',
            sessionId: '00000000-0000-4000-8000-000000000002',
            threadNumber: 1,
            priorityScore: 1,
            calledAt: '2026-10-08T08:00:00Z',
            person: {},
          },
        });
      },
    ),
  );
  const request = callNextAndCommit('00000000-0000-4000-8000-000000000004');
  expect(
    useOperationStore.getState().activeCalls['00000000-0000-4000-8000-000000000004'],
  ).toBeUndefined();
  confirm();
  await expect(request).resolves.toBe('called');
  expect(
    useOperationStore.getState().activeCalls['00000000-0000-4000-8000-000000000004']
      ?.registrationId,
  ).toBe('00000000-0000-4000-8000-000000000009');
});

it('treats an empty queue as a normal outcome and keeps local state unchanged', async () => {
  mockServer.use(
    http.post('http://localhost:3000/api/v1/queues/00000000-0000-4000-8000-000000000004/next', () =>
      HttpResponse.json(
        {
          code: 'NO_CALLABLE_REGISTRATION',
          translationKey: 'queue.next.no_callable_registration',
          translationParams: {},
          data: null,
        },
        { status: 404 },
      ),
    ),
  );

  await expect(callNextAndCommit('00000000-0000-4000-8000-000000000004')).resolves.toBe('empty');
  expect(
    useOperationStore.getState().activeCalls['00000000-0000-4000-8000-000000000004'],
  ).toBeUndefined();
});

it('treats the new HTTP 200 empty object response as an empty queue', async () => {
  mockServer.use(
    http.post('http://localhost:3000/api/v1/queues/00000000-0000-4000-8000-000000000004/next', () =>
      HttpResponse.json({
        code: 'OK',
        translationKey: null,
        translationParams: {},
        data: {},
      }),
    ),
  );

  await expect(callNextAndCommit('00000000-0000-4000-8000-000000000004')).resolves.toBe('empty');
  expect(
    useOperationStore.getState().activeCalls['00000000-0000-4000-8000-000000000004'],
  ).toBeUndefined();
});

it('keeps local state unchanged on a 409 conflict', async () => {
  mockServer.use(
    http.post('http://localhost:3000/api/v1/queues/00000000-0000-4000-8000-000000000004/next', () =>
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
  await expect(callNextAndCommit('00000000-0000-4000-8000-000000000004')).rejects.toMatchObject({
    status: 409,
  });
  expect(
    useOperationStore.getState().activeCalls['00000000-0000-4000-8000-000000000004'],
  ).toBeUndefined();
});
