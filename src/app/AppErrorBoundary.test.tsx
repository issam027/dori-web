import { render, screen } from '@testing-library/react';
import { AppErrorBoundary } from './AppErrorBoundary';

function BrokenPage(): never {
  throw new Error('Aucun ticket disponible');
}

describe('AppErrorBoundary', () => {
  it('keeps a diagnostic panel available when a page crashes', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <AppErrorBoundary variant="embedded">
        <BrokenPage />
      </AppErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeVisible();
    expect(screen.getByRole('heading', { name: /rencontré une erreur/i })).toBeVisible();
    expect(screen.getByText('Aucun ticket disponible')).toBeVisible();
    expect(screen.getByText('Incident', { selector: 'dt' })).toBeVisible();
    consoleError.mockRestore();
  });
});
