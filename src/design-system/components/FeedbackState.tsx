import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export function EmptyState({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="feedback-state">
      <div className="feedback-icon" aria-hidden="true">
        ○
      </div>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {action}
    </section>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <section className="feedback-state" role="alert">
      <div className="feedback-icon error" aria-hidden="true">
        !
      </div>
      <h2>{t('states.error')}</h2>
      {onRetry ? (
        <button className="button button-primary" type="button" onClick={onRetry}>
          {t('common.retry')}
        </button>
      ) : null}
    </section>
  );
}
