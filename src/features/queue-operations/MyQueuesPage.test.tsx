import { render, screen, waitFor, within } from '@testing-library/react';
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

it('provides a mobile card with the primary registration actions', () => {
  useWaitingRegistrations.mockReturnValue({
    data: {
      data: {
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1,
        items: [
          {
            registrationId: 42,
            personId: 7,
            queueId: 10,
            firstName: 'Ada',
            lastName: 'Lovelace',
            ticketNumber: 'A-042',
            entryType: 'walk_in',
            status: 'waiting',
            tierId: 1,
            tierName: 'Standard',
            activeNoteCount: 2,
          },
        ],
      },
    },
  });

  render(<MyQueuesPage />);

  const mobileList = screen.getByRole('list', { name: /passages de la journée/i });
  const card = within(mobileList).getByRole('listitem');
  expect(card).toHaveTextContent('Ada Lovelace');
  expect(card).toHaveTextContent('A-042');
  expect(within(card).getByRole('button', { name: /^consulter$/i })).toBeVisible();
  expect(within(card).getByRole('button', { name: /consulter les notes/i })).toBeVisible();
});
