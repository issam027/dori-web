import { Fragment, type Key, type ReactNode } from 'react';
import { DorifyLoader } from './DorifyLoader';
import { EmptyState, ErrorState } from './FeedbackState';

interface DataTableLoadingProps {
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

interface DataColumn<TRow> {
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
  renderMobileRow?: (row: TRow) => ReactNode;
}

interface DataTableCompositionProps<TRow> {
  children: ReactNode;
  caption: string;
  containerClassName?: string | null;
  mobileRows?: readonly TRow[];
  getMobileRowKey?: (row: TRow) => Key;
  renderMobileRow?: (row: TRow) => ReactNode;
}

type DataTableProps<TRow> = (DataTableRowsProps<TRow> | DataTableCompositionProps<TRow>) &
  DataTableLoadingProps;

export function DataTable<TRow = never>(props: DataTableProps<TRow>) {
  if (props.error) return <ErrorState onRetry={props.onRetry} />;
  if (props.loading) {
    return (
      <div className="data-table-loading">
        <DorifyLoader compact />
      </div>
    );
  }
  if (props.empty && props.emptyTitle) {
    return <EmptyState title={props.emptyTitle} description={props.emptyDescription} />;
  }
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

  const mobileRows = 'rows' in props ? props.rows : props.mobileRows;
  const getMobileRowKey = 'rows' in props ? props.getRowKey : props.getMobileRowKey;
  const hasMobileLayout = Boolean(props.renderMobileRow && mobileRows && getMobileRowKey);

  if ('containerClassName' in props && props.containerClassName === null && !hasMobileLayout) {
    return table;
  }
  const containerClassName =
    'containerClassName' in props ? (props.containerClassName ?? 'table-scroll') : 'table-scroll';

  const tableContainer =
    'containerClassName' in props && props.containerClassName === null ? (
      table
    ) : (
      <div className={containerClassName} tabIndex={0}>
        {table}
      </div>
    );

  if (hasMobileLayout && mobileRows && getMobileRowKey && props.renderMobileRow) {
    return (
      <div className="responsive-data-table">
        <div className="responsive-data-table-desktop">{tableContainer}</div>
        <div className="responsive-data-table-mobile" role="list" aria-label={props.caption}>
          {mobileRows.map((row) => (
            <Fragment key={getMobileRowKey(row)}>{props.renderMobileRow?.(row)}</Fragment>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={containerClassName} tabIndex={0}>
      {table}
    </div>
  );
}
