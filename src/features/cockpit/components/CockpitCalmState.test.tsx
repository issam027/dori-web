import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CockpitCalmState } from './CockpitCalmState';
it('acknowledges ongoing service without inventing an appointment time', () => {
  render(
    <MemoryRouter>
      <CockpitCalmState
        activeCalls={1}
        appointments={2}
        canViewAppointments={true}
        hidden={false}
      />
    </MemoryRouter>,
  );
  expect(screen.getByText(/prises en charge en cours/i)).toBeVisible();
  expect(screen.getByText(/Rendez-vous restants.*2/i)).toBeVisible();
  expect(screen.getByRole('link', { name: /pr.parer les rendez-vous/i })).toHaveAttribute(
    'href',
    '/appointments',
  );
});
it('does not offer agenda navigation without permission', () => {
  render(
    <MemoryRouter>
      <CockpitCalmState
        activeCalls={0}
        appointments={2}
        canViewAppointments={false}
        hidden={false}
      />
    </MemoryRouter>,
  );
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});
