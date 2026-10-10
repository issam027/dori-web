import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DorifyLoader } from './DorifyLoader';

describe('DorifyLoader', () => {
  it('affiche la marque et le slogan dans un statut accessible', () => {
    render(<DorifyLoader />);

    expect(screen.getByRole('status')).toHaveTextContent('DORIFY');
    expect(screen.getByRole('status')).toHaveTextContent(/files.*contrôle/i);
  });

  it('propose une variante compacte', () => {
    render(<DorifyLoader compact />);
    expect(screen.getByRole('status')).toHaveClass('dorify-loader-compact');
  });
});
