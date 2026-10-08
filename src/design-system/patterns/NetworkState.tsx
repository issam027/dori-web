import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

type NetworkStatus = 'loading' | 'success' | 'empty' | 'error' | 'forbidden' | 'conflict';

interface NetworkStateProps {
  status: NetworkStatus;
  children: ReactNode;
  onRetry?: () => void;
}

export function NetworkState({ status, children, onRetry }: NetworkStateProps) {
  const { t } = useTranslation();
  if (status === 'success') return children;
  if (status === 'loading') return <p role="status">{t('common.loading')}</p>;
  if (status === 'empty') return <p>{t('states.empty')}</p>;
  if (status === 'forbidden') return <p role="alert">{t('states.forbidden')}</p>;
  if (status === 'conflict') return <p role="alert">{t('states.conflict')}</p>;
  return (
    <section role="alert">
      <p>{t('states.error')}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry}>
          {t('common.retry')}
        </button>
      ) : null}
    </section>
  );
}
