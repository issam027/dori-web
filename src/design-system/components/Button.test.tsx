import { createRef, type SyntheticEvent } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Save } from 'lucide-react';
import { Button } from './Button';

describe('Button', () => {
  it('uses button semantics by default and forwards its ref', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Action</Button>);

    const button = screen.getByRole('button', { name: 'Action' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass('button');
    expect(ref.current).toBe(button);
  });

  it('maps variants and sizes to the existing design-system classes', () => {
    const { rerender } = render(
      <Button variant="primary" size="small">
        Enregistrer
      </Button>,
    );
    expect(screen.getByRole('button')).toHaveClass('button', 'button-primary', 'button-small');

    rerender(
      <Button variant="danger" size="icon" aria-label="Supprimer">
        ×
      </Button>,
    );
    expect(screen.getByRole('button')).toHaveClass('button', 'button-danger', 'icon-button');
  });

  it('exposes pending state and prevents activation', async () => {
    const onClick = vi.fn();
    render(
      <Button pending onClick={onClick}>
        Envoi
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Envoi' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('preserves an explicit submit type', async () => {
    const onSubmit = vi.fn<(event: SyntheticEvent<HTMLFormElement, SubmitEvent>) => void>((event) => {
      event.preventDefault();
    });
    render(
      <form onSubmit={onSubmit}>
        <Button type="submit">Valider</Button>
      </form>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Valider' }));
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('supports keyboard activation, focus and an accessible icon label', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button icon={<Save />} label="Enregistrer" onClick={onClick} />);

    await user.tab();
    const button = screen.getByRole('button', { name: 'Enregistrer' });
    expect(button).toHaveFocus();
    expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('preserves specialized classes without adding the standard button class', () => {
    render(
      <Button variant="unstyled" className="topbar-icon-button" aria-label="Menu">
        M
      </Button>,
    );
    expect(screen.getByRole('button')).toHaveClass('topbar-icon-button');
    expect(screen.getByRole('button')).not.toHaveClass('button');
  });
});
