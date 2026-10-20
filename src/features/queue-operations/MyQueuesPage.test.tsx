import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyQueuesPage } from './MyQueuesPage';

const useWaitingRegistrations = vi.fn<(options: unknown) => unknown>();

vi.mock('@/features/queues/hooks/useQueues', () => ({
  useQueues: () => ({
    isSuccess: true,
    data: { data: { total: 1, items: [{ queueId: 10, queueName: 'Accueil' }] } },
  }),
}));

vi.mock('./hooks/useQueueOperations', () => ({
  useWaitingRegistrations: (options: unknown) => useWaitingRegistrations(options),
}));

vi.mock('@/features/notes/PersonNotesViewer', () => ({ PersonNotesViewer: () => null }));
vi.mock('./RegistrationDetailsModal', () => ({ RegistrationDetailsModal: () => null }));

it('publishes one registration search after a typing burst reaches four characters', async () => {
  useWaitingRegistrations.mockReturnValue({
    data: { data: { page: 1, pageSize: 10, total: 0, totalPages: 0, items: [] } },
  });
  render(<MyQueuesPage />);
  useWaitingRegistrations.mockClear();

  await userEvent.type(screen.getByRole('searchbox'), 'abcd');

  await waitFor(() => {
    const searches = useWaitingRegistrations.mock.calls
      .map(([options]) => (options as { search?: string }).search)
      .filter(Boolean);
    expect(searches).toEqual(['abcd']);
  });
});
