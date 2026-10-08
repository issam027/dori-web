import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useSessionStore } from '@/core/auth/session-store';
import { ProtectedRoute } from './ProtectedRoute';

afterEach(() => {
  useSessionStore.getState().clear();
});

it('forces users flagged by the API onto the password change route', () => {
  useSessionStore.getState().authenticate({
    userId: 1,
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
