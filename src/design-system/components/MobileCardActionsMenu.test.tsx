import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';
import { MobileCardActionsMenu } from './MobileCardActionsMenu';

describe('MobileCardActionsMenu', () => {
  it('supports keyboard navigation and restores focus on Escape', async () => {
    const user = userEvent.setup();
    render(
      <MobileCardActionsMenu label="Actions">
        <Button>Consulter</Button>
        <Button>Supprimer</Button>
      </MobileCardActionsMenu>,
    );

    const trigger = screen.getByRole('button', { name: 'Actions' });
    trigger.focus();
    await user.keyboard('{ArrowDown}');

    expect(screen.getByRole('menu')).toBeVisible();
    expect(screen.getByRole('menuitem', { name: 'Consulter' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Supprimer' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
