import { render, screen } from '@testing-library/react';
import { MobileAgenda } from './MobileAgenda';

it('distinguishes a closed day from an open day with no appointments', () => {
  render(
    <MobileAgenda
      date="2026-10-31"
      today="2026-10-31"
      timeZone="Europe/Paris"
      appointments={[]}
      open={false}
      onDate={vi.fn()}
      onCreate={vi.fn()}
      onSelect={vi.fn()}
    />,
  );

  expect(screen.getByRole('status')).toHaveTextContent(/journée fermée/i);
  expect(screen.getByText(/sélectionnez une autre date/i)).toBeVisible();
  expect(screen.queryByText(/aucun rendez-vous pour cette journée/i)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /nouveau rendez-vous/i })).not.toBeInTheDocument();
});
