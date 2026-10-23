import { render, screen, within } from '@testing-library/react';
import { DataTable } from './DataTable';

describe('DataTable', () => {
  it('shows the Dorify loader inside the table region while loading', () => {
    render(
      <DataTable
        loading
        caption="Utilisateurs"
        rows={[]}
        getRowKey={(row: { id: string }) => row.id}
        columns={[{ key: 'name', header: 'Nom', render: () => 'Nom' }]}
      />,
    );

    expect(screen.getByRole('status')).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders typed rows with scoped headers and a focusable scroll region', () => {
    render(
      <DataTable
        caption="Utilisateurs"
        rows={[{ id: '00000000-0000-4000-8000-000000000001', name: 'Ada' }]}
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
        rows={[{ id: '00000000-0000-4000-8000-000000000007', name: 'Ada Lovelace' }]}
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
