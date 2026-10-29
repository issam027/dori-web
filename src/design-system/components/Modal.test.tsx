import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './Modal';

describe('ConfirmDialog', () => {
  it('locks the confirmation action while it is pending', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <ConfirmDialog
        open
        onOpenChange={vi.fn()}
        title="Désactiver le site"
        confirmLabel="Désactiver"
        pending
        onConfirm={onConfirm}
      />,
    );

    const confirm = screen.getByRole('button', { name: 'Désactiver' });
    expect(confirm).toBeDisabled();
    expect(confirm).toHaveAttribute('aria-busy', 'true');
    await user.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
