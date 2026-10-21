import { render, screen, within } from '@testing-library/react';
import { DataTable } from './DataTable';

describe('DataTable', () => {
  it('renders typed rows with scoped headers and a focusable scroll region', () => {
    render(
      <DataTable
        caption="Utilisateurs"
        rows={[{ id: 1, name: 'Ada' }]}
        getRowKey={(row) => row.id}
        columns={[{ key: 'name', header: 'Nom', render: (row) => row.name }]}
      />,
    );

    const table = screen.getByRole('table', { name: 'Utilisateurs' });
    expect(screen.getByRole('columnheader', { name: 'Nom' })).toHaveAttribute('scope', 'col');
    expect(within(table).getByRole('cell', { name: 'Ada' })).toBeVisible();
    expect(table.parentElement).toHaveClass('table-scroll');
    expect(table.parentElement).toHaveAttribute('tabindex', '0');
  });

  it('preserves composed table markup and supports an existing outer container', () => {
    const { container } = render(
      <div className="kiosk-review">
        <DataTable caption="Récapitulatif" containerClassName={null}>
          <tbody>
            <tr>
              <th scope="row">Service</th>
              <td>Accueil</td>
            </tr>
          </tbody>
        </DataTable>
      </div>,
    );

    const table = screen.getByRole('table', { name: 'Récapitulatif' });
    expect(table.parentElement).toBe(container.querySelector('.kiosk-review'));
    expect(screen.getByRole('rowheader', { name: 'Service' })).toBeVisible();
  });

  it('provides separate desktop table and mobile card layouts when configured', () => {
    render(
      <DataTable
        caption="Personnes"
        rows={[{ id: 7, name: 'Ada Lovelace' }]}
        getRowKey={(row) => row.id}
        columns={[{ key: 'name', header: 'Nom', render: (row) => row.name }]}
        renderMobileRow={(row) => (
          <article className="data-table-mobile-card" role="listitem">
            {row.name}
          </article>
        )}
      />,
    );

    const table = screen.getByRole('table', { name: 'Personnes' });
    const mobileList = screen.getByRole('list', { name: 'Personnes' });

    expect(table.closest('.responsive-data-table-desktop')).toBeInTheDocument();
    expect(mobileList).toHaveClass('responsive-data-table-mobile');
    expect(within(mobileList).getByRole('listitem')).toHaveTextContent('Ada Lovelace');
  });
});
