import type { Key, ReactNode } from 'react';

export interface DataColumn<TRow> {
  key: string;
  header: ReactNode;
  render: (row: TRow) => ReactNode;
  align?: 'start' | 'center' | 'end';
}

interface DataTableRowsProps<TRow> {
  rows: readonly TRow[];
  columns: readonly DataColumn<TRow>[];
  getRowKey: (row: TRow) => Key;
  caption: string;
}

interface DataTableCompositionProps {
  children: ReactNode;
  caption: string;
  containerClassName?: string | null;
}

type DataTableProps<TRow> = DataTableRowsProps<TRow> | DataTableCompositionProps;

export function DataTable<TRow = never>(props: DataTableProps<TRow>) {
  const table =
    'rows' in props ? (
      <table>
        <caption className="sr-only">{props.caption}</caption>
        <thead>
          <tr>
            {props.columns.map((column) => (
              <th key={column.key} scope="col" data-align={column.align}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row) => (
            <tr key={props.getRowKey(row)}>
              {props.columns.map((column) => (
                <td key={column.key} data-align={column.align}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    ) : (
      <table>
        <caption className="sr-only">{props.caption}</caption>
        {props.children}
      </table>
    );

  if ('containerClassName' in props && props.containerClassName === null) return table;
  const containerClassName =
    'containerClassName' in props ? (props.containerClassName ?? 'table-scroll') : 'table-scroll';
  return (
    <div className={containerClassName} tabIndex={0}>
      {table}
    </div>
  );
}
