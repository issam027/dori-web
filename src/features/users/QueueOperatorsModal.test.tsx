import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueueOperatorsModal } from './QueueOperatorsModal';

const findUsers = vi.fn<(...args: unknown[]) => unknown>();
const assignOperator = vi.fn<(...args: unknown[]) => unknown>();
const getOperators = vi.fn<(...args: unknown[]) => unknown>().mockResolvedValue({
  data: { page: 1, pageSize: 10, total: 0, totalPages: 0, items: [] },
});

vi.mock('@/api/generated/users/users', () => ({
  usersControllerFindUsers: (...args: unknown[]) => findUsers(...args),
}));

vi.mock('@/api/generated/queues/queues', () => ({
  queuesControllerGetOperators: (...args: unknown[]) => getOperators(...args),
  queuesControllerAssignOperator: (...args: unknown[]) => assignOperator(...args),
  queuesControllerRemoveOperator: vi.fn(),
}));

function renderModal(client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  render(
    <QueryClientProvider client={client}>
      <QueueOperatorsModal
        queue={{ queueId: 10, queueName: 'Accueil', siteId: 1 }}
        onOpenChange={() => {
          // The close callback is irrelevant to these characterizations.
        }}
      />
    </QueryClientProvider>,
  );
  return client;
}

it('issues one candidate request after a typing burst reaches four characters', async () => {
  findUsers.mockResolvedValue({
    data: { page: 1, pageSize: 5, total: 0, totalPages: 0, items: [] },
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  renderModal(client);

  const addAssignment = screen.getByRole('button', { name: /ajouter une affectation/i });
  expect(addAssignment).toHaveClass('button', 'button-primary');
  await userEvent.click(addAssignment);
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

it('refreshes the centralized operator list after a successful assignment', async () => {
  findUsers.mockResolvedValue({
    data: {
      page: 1,
      pageSize: 5,
      total: 1,
      totalPages: 1,
      items: [{ userId: 8, username: 'alice', fullName: 'Alice Martin', isActive: true }],
    },
  });
  assignOperator.mockResolvedValue({ data: { data: {} } });
  const client = renderModal();
  const invalidate = vi.spyOn(client, 'invalidateQueries');

  await userEvent.click(screen.getByRole('button', { name: /ajouter une affectation/i }));
  await userEvent.type(screen.getByRole('searchbox'), 'abcd');
  await userEvent.click(await screen.findByRole('button', { name: /alice martin/i }));
  await userEvent.click(screen.getByRole('button', { name: /confirmer/i }));

  await waitFor(() => {
    expect(assignOperator).toHaveBeenCalledWith(10, { userId: 8 });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['queue-operators', 10] });
  });
});
