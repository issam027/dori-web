import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Pagination } from './Pagination';

describe('Pagination', () => {
  it.each([0, 1])('does not render controls for %i page', (totalPages) => {
    render(<Pagination page={1} totalPages={totalPages} onPageChange={vi.fn()} />);

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('renders controls when navigation between pages is possible', () => {
    render(<Pagination page={1} totalPages={2} onPageChange={vi.fn()} />);

    expect(screen.getByRole('navigation')).toBeVisible();
  });
});
