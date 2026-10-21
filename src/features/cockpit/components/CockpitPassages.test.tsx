import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CockpitPassages } from './CockpitPassages';

const passage = {
  registrationId: 12,
  ticketNumber: 'A-012',
  personName: 'Ada Lovelace',
  arrivedAt: '2026-10-21T08:30:00.000Z',
  calledAt: '2026-10-21T08:45:00.000Z',
  closedAt: '2026-10-21T09:00:00.000Z',
  threadNumber: 2,
  outcome: 'served' as const,
};

describe('CockpitPassages', () => {
  it('exposes mobile-friendly status controls and passage details', async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();
    render(
      <CockpitPassages
        passages={[passage]}
        status="served"
        totalCount={1}
        onStatusChange={onStatusChange}
      />,
    );

    expect(screen.getByRole('heading', { name: /récapitulatif des passages/i })).toBeVisible();
    expect(screen.getByText('Ada Lovelace')).toBeVisible();
    expect(screen.getByText(/A-012/)).toBeVisible();
    expect(screen.getByRole('button', { name: /servis/i })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: /no-show/i }));
    expect(onStatusChange).toHaveBeenCalledWith('no_show');
  });
});
