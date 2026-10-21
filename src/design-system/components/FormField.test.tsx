import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormField } from './FormField';

describe('FormField', () => {
  it('associates its label and accessible hint with the control', () => {
    render(
      <FormField label="T�l�phone" hint="Format international" required>
        <input name="phone" />
      </FormField>,
    );

    const input = screen.getByRole('textbox', { name: /T�l�phone/ });
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).toBeRequired();
    expect(input).toHaveAccessibleDescription('Format international');
  });

  it('exposes errors and success without stacking competing messages', () => {
    const { rerender } = render(
      <FormField label="Email" error="Adresse invalide" hint="Aide">
        <input type="email" />
      </FormField>,
    );

    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Adresse invalide');
    expect(screen.queryByText('Aide')).not.toBeInTheDocument();

    rerender(
      <FormField label="Email" success="Adresse v�rifi�e">
        <input type="email" />
      </FormField>,
    );
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAccessibleDescription(
      'Adresse v�rifi�e',
    );
  });

  it('preserves an explicit id and existing accessible description', () => {
    render(
      <>
        <span id="external-help">Aide externe</span>
        <FormField label="Recherche" hint="Trois caract�res minimum">
          <input id="person-search" type="search" aria-describedby="external-help" />
        </FormField>
      </>,
    );

    const input = screen.getByRole('searchbox', { name: 'Recherche' });
    expect(input).toHaveAttribute('id', 'person-search');
    expect(input).toHaveAccessibleDescription('Aide externe Trois caract�res minimum');
  });
});
