import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueueOperatorsModal } from './QueueOperatorsModal';

const findUsers = vi.fn();

vi.mock('@/api/generated/users/users', () => ({
  usersControllerFindUsers: (...args: unknown[]) => findUsers(...args) as never,
}));

vi.mock('@/api/generated/queues/queues', () => ({
  queuesControllerGetOperators: vi.fn().mockResolvedValue({
    data: { data: { page: 1, pageSize: 10, total: 0, totalPages: 0, items: [] } },
  }),
  queuesControllerAssignOperator: vi.fn(),
  queuesControllerRemoveOperator: vi.fn(),
}));

it('issues one candidate request after a typing burst reaches four characters', async () => {
  findUsers.mockResolvedValue({
    data: { data: { page: 1, pageSize: 5, total: 0, totalPages: 0, items: [] } },
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <QueueOperatorsModal
        queue={{ queueId: 10, queueName: 'Accueil', siteId: 1 }}
        onOpenChange={() => {
          // The close callback is irrelevant to this search characterization.
        }}
      />
    </QueryClientProvider>,
  );

  await userEvent.click(screen.getByRole('button', { name: /ajouter une affectation/i }));
  await userEvent.type(screen.getByRole('searchbox'), 'abcd');

  await waitFor(() => {
    expect(findUsers).toHaveBeenCalledOnce();
  });
  expect(findUsers.mock.calls[0]?.[0]).toMatchObject({
    search: 'abcd',
    siteIds: '1',
    pageSize: 5,
  });
});
