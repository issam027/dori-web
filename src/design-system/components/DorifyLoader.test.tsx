import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DorifyLoader } from './DorifyLoader';

describe('DorifyLoader', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('affiche la marque et le slogan dans un statut accessible', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<DorifyLoader />);

    expect(screen.getByRole('status')).toHaveTextContent('DORIFY');
    expect(screen.getByRole('status')).toHaveTextContent(/files.*contrôle/i);
  });

  it('propose une variante compacte', () => {
    render(<DorifyLoader compact />);
    expect(screen.getByRole('status')).toHaveClass('dorify-loader-compact');
  });
});
