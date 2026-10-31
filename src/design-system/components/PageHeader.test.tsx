import { render, screen } from '@testing-library/react';
import { PageHeader } from './PageHeader';

it('keeps status pills in the title row while actions remain separate', () => {
  render(
    <PageHeader
      eyebrow="Operations"
      title="Cockpit opérateur"
      status={<span className="status-badge">Temps réel actif</span>}
      actions={<button type="button">Appeler</button>}
    />,
  );

  const title = screen.getByRole('heading', { name: 'Cockpit opérateur' });
  const status = screen.getByText('Temps réel actif');
  const action = screen.getByRole('button', { name: 'Appeler' });

  expect(status.closest('.page-title-row')).toContainElement(title);
  expect(action.closest('.page-actions')).toBeInTheDocument();
  expect(action.closest('.page-title-row')).not.toBeInTheDocument();
});
