import { useTranslation } from 'react-i18next';

export function DorifyLoader({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();

  return (
    <div
      className={`dorify-loader${compact ? ' dorify-loader-compact' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="dorify-loader-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <strong>{t('app.name')}</strong>
      <p>{t('loading.slogan')}</p>
      <small>{t('common.loading')}</small>
    </div>
  );
}
