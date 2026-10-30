import { createRef, type SyntheticEvent } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Save } from 'lucide-react';
import { Button, ButtonLabelModeProvider } from './Button';

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

    rerender(<Button variant="success">Servi</Button>);
    expect(screen.getByRole('button')).toHaveClass('button', 'button-success');

    rerender(<Button variant="info">Rappeler</Button>);
    expect(screen.getByRole('button')).toHaveClass('button', 'button-info');

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
    const onSubmit = vi.fn<(event: SyntheticEvent<HTMLFormElement, SubmitEvent>) => void>(
      (event) => {
        event.preventDefault();
      },
    );
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

  it('keeps labels by default and supports explicit label modes', () => {
    const { rerender } = render(<Button icon={<Save />} label="Enregistrer" />);
    expect(screen.getByRole('button')).toHaveClass('button-label-always', 'button-has-icon');

    rerender(<Button icon={<Save />} label="Enregistrer" labelMode="always" />);
    expect(screen.getByRole('button')).toHaveClass('button-label-always', 'button-has-icon');

    rerender(<Button icon={<Save />} label="Enregistrer" labelMode="icon-only" />);
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toHaveClass(
      'button-label-icon-only',
    );
  });

  it('does not treat formatted day numbers as icons', () => {
    render(
      <Button>
        <strong>30</strong>
      </Button>,
    );
    expect(screen.getByRole('button', { name: '30' })).not.toHaveClass('button-has-icon');
  });

  it('inherits the label mode from its layout context', () => {
    render(
      <ButtonLabelModeProvider value="always">
        <Button icon={<Save />} label="Enregistrer" />
      </ButtonLabelModeProvider>,
    );
    expect(screen.getByRole('button')).toHaveClass('button-label-always');
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

  it('explains why a disabled action is unavailable', () => {
    render(
      <Button disabled unavailableReason="Une session active est requise">
        Appeler
      </Button>,
    );

    expect(screen.getByRole('button', { name: 'Appeler' })).toHaveAttribute(
      'title',
      'Une session active est requise',
    );
    expect(screen.getByText('Une session active est requise')).toBeVisible();
  });
});
