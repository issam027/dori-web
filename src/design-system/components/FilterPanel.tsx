import type { ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';
import { useTranslation } from 'react-i18next';

export function FilterPanel({
  icon,
  title,
  description,
  activeCount = 0,
  resetLabel,
  onReset,
  className,
  onOpenChange,
  children,
  primary,
  context,
}: {
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  activeCount?: number;
  resetLabel?: string;
  onReset?: () => void;
  className?: string;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
  primary?: ReactNode;
  context?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <Card className={['admin-filter-card', className].filter(Boolean).join(' ')}>
      {primary ? (
        <div className="filter-primary">
          {primary}
          {context ? <small className="filter-context">{context}</small> : null}
        </div>
      ) : null}
      <details
        onToggle={(event) => {
          onOpenChange?.(event.currentTarget.open);
        }}
      >
        <summary>
          <span>
            <span aria-hidden="true">{icon}</span> {primary ? t('mobile.filters') : title}
            {activeCount > 0 ? (
              <strong className="status-badge status-info">{activeCount}</strong>
            ) : null}
          </span>
          {description ? <small>{description}</small> : null}
        </summary>
        {children}
      </details>
      {activeCount > 0 && onReset && resetLabel ? (
        <div className="admin-filter-actions">
          <Button size="small" type="button" onClick={onReset}>
            <RotateCcw aria-hidden="true" />
            {resetLabel}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
