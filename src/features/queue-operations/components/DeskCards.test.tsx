import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActiveCallCard, QueueDeskCard } from './DeskCards';

describe('desk cockpit cards', () => {
  it('keeps served and absent as the primary active-call commands', async () => {
    const user = userEvent.setup();
    const onServed = vi.fn();
    const onNoShow = vi.fn();
    render(
      <ActiveCallCard
        call={
          { ticketNumber: 'A001', threadNumber: 2, calledAt: new Date().toISOString() } as never
        }
        personName="Ada Lovelace"
        noteCount={3}
        pending={false}
        onServed={onServed}
        onNoShow={onNoShow}
        onNotes={() => undefined}
      />,
    );
    await user.click(screen.getByRole('button', { name: /servi/i }));
    await user.click(screen.getByRole('button', { name: /absent/i }));
    expect(onServed).toHaveBeenCalledOnce();
    expect(onNoShow).toHaveBeenCalledOnce();
    expect(screen.getByText('Ada Lovelace')).toBeVisible();
  });

  it('marks a queue with an active desk and delegates call-next', async () => {
    const user = userEvent.setup();
    const onCallNext = vi.fn();
    const { container } = render(
      <QueueDeskCard
        queue={{ queueId: 1, queueName: 'Accueil' } as never}
        session={{ sessionId: 4, threadNumber: 1, counterName: 'Bureau A' } as never}
        active
        waitingCount={2}
        estimatedWaitMinutes={6}
        pending={false}
        hasActiveCall={false}
        onRelease={() => undefined}
        onOccupy={() => undefined}
        onCallNext={onCallNext}
      />,
    );
    expect(container.querySelector('.queue-desk-card')).toHaveClass('has-open-desk');
    expect(screen.getByText('Bureau A')).toBeVisible();
    await user.click(screen.getByRole('button', { name: /appeler le suivant/i }));
    expect(onCallNext).toHaveBeenCalledOnce();
  });
});
