import type { Key, ReactNode } from 'react';

export interface DataColumn<TRow> {
  key: string;
  header: ReactNode;
  render: (row: TRow) => ReactNode;
  align?: 'start' | 'center' | 'end';
}

export function DataTable<TRow>({
  rows,
  columns,
  getRowKey,
  caption,
}: {
  rows: readonly TRow[];
  columns: readonly DataColumn<TRow>[];
  getRowKey: (row: TRow) => Key;
  caption: string;
}) {
  return (
    <div className="table-scroll" tabIndex={0}>
      <table>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" data-align={column.align}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)}>
              {columns.map((column) => (
                <td key={column.key} data-align={column.align}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
