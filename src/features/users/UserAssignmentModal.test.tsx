import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/shared/testing/mock-server';
import { UserAssignmentModal } from './UserAssignmentModal';

const managerRole = {
  roleId: 3,
  roleName: 'manager',
  rank: 3,
  isActive: true,
  permissions: [],
};

function renderModal() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <UserAssignmentModal
        target={{ kind: 'site', id: 1, label: 'Paris' }}
        roles={[managerRole]}
        onOpenChange={() => undefined}
        onAssigned={() => undefined}
      />
    </QueryClientProvider>,
  );
}

it('searches users only from four characters with five results per page', async () => {
  const requests: URL[] = [];
  mockServer.use(
    http.get('http://localhost:3000/api/v1/users', ({ request }) => {
      requests.push(new URL(request.url));
      return HttpResponse.json({
        data: { page: 1, pageSize: 5, total: 0, totalPages: 0, items: [] },
      });
    }),
  );
  renderModal();
  const input = screen.getByRole('searchbox', { name: /nom d.utilisateur ou email/i });
  await userEvent.type(input, 'abc');
  expect(requests).toHaveLength(0);
  await userEvent.type(input, 'd');
  await waitFor(() => {
    expect(requests).toHaveLength(1);
  });
  expect(requests[0]?.searchParams.get('search')).toBe('abcd');
  expect(requests[0]?.searchParams.get('pageSize')).toBe('5');
  expect(requests[0]?.searchParams.get('userType')).toBe('human');
});

