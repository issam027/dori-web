import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useSessionStore } from '@/core/auth/session-store';
import { ProtectedRoute } from './ProtectedRoute';

afterEach(() => {
  useSessionStore.getState().clear();
});

it('forces users flagged by the API onto the password change route', () => {
  useSessionStore.getState().authenticate({
    userId: '00000000-0000-4000-8000-000000000001',
    username: 'u',
    userType: 'human',
    roles: [],
    permissions: ['queue_view'],
    mustChangePassword: true,
    scope: { isGlobal: true, siteIds: [], queueIds: [] },
  });
  render(
    <MemoryRouter initialEntries={['/my-queues']}>
      <Routes>
        <Route element={<ProtectedRoute permissions={['queue_view']} />}>
          <Route path="/my-queues" element={<p>Files</p>} />
          <Route path="/change-password" element={<p>Mot de passe imposé</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.getByText('Mot de passe imposé')).toBeVisible();
  expect(screen.queryByText('Files')).not.toBeInTheDocument();
});

it.each(['admin', 'root'])('restricts a root-only route for %s', (role) => {
  useSessionStore
    .getState()
    .authenticate({
      userId: '00000000-0000-4000-8000-000000000001',
      username: 'test',
      userType: 'human',
      roles: [role],
      permissions: ['system_manage'],
      mustChangePassword: false,
      scope: { isGlobal: true, siteIds: [], queueIds: [] },
    });
  render(
    <MemoryRouter initialEntries={['/admin/site-requests']}>
      <Routes>
        <Route element={<ProtectedRoute rootOnly />}>
          <Route path="/admin/site-requests" element={<p>Demandes privées</p>} />
        </Route>
        <Route path="/forbidden" element={<p>Accès refusé</p>} />
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.getByText(role === 'root' ? 'Demandes privées' : 'Accès refusé')).toBeVisible();
});
