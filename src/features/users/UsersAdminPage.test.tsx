import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UsersAdminPage } from './UsersAdminPage';

const findUsers = vi.fn<(...args: unknown[]) => unknown>();

vi.mock('@/features/onboarding/api/onboarding-api', () => ({
  findUsers: (...args: unknown[]) => findUsers(...args),
  findUserById: vi.fn(),
  deleteUser: vi.fn(),
  logoutUserSessions: vi.fn(),
  setUserPassword: vi.fn(),
  updateUser: vi.fn(),
  updateUserStatus: vi.fn(),
}));

vi.mock('@/features/onboarding/hooks/useSettingsData', () => ({
  useSettingsData: () => ({ sites: [], queues: [], roles: [] }),
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <UsersAdminPage />
    </QueryClientProvider>,
  );
}

it('issues one user request after a typing burst reaches four characters', async () => {
  findUsers.mockResolvedValue({
    data: { data: { page: 1, pageSize: 10, total: 0, totalPages: 0, items: [] } },
  });
  renderPage();
  await waitFor(() => {
    expect(findUsers).toHaveBeenCalledOnce();
  });
  findUsers.mockClear();

  await userEvent.type(screen.getByRole('textbox', { name: /recherche/i }), 'abcd');

  await waitFor(() => {
    expect(findUsers).toHaveBeenCalledOnce();
  });
  expect(findUsers.mock.calls[0]?.[0]).toMatchObject({ search: 'abcd', pageSize: 10 });
});
