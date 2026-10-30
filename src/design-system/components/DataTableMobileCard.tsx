import type { ReactNode } from 'react';
import { ButtonLabelModeProvider } from './Button';

export interface MobileCardField {
  label: ReactNode;
  value: ReactNode;
  wide?: boolean;
}

export function DataTableMobileCard({
  title,
  subtitle,
  badge,
  fields,
  actions,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  fields: readonly MobileCardField[];
  actions: ReactNode;
  className?: string;
}) {
  return (
    <ButtonLabelModeProvider value="always">
      <article
        className={`data-table-mobile-card${className ? ` ${className}` : ''}`}
        role="listitem"
      >
        <div className="data-table-mobile-card-body">
          <header className="data-table-mobile-card-heading">
            <div>
              <strong>{title}</strong>
              {subtitle !== undefined ? <small>{subtitle}</small> : null}
            </div>
            {badge}
          </header>
          <dl className="data-table-mobile-card-details">
            {fields.map((field, index) => (
              <div key={index} className={field.wide ? 'is-wide' : undefined}>
                <dt>{field.label}</dt>
                <dd>{field.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        {actions ? <footer className="data-table-mobile-card-footer">{actions}</footer> : null}
      </article>
    </ButtonLabelModeProvider>
  );
}
