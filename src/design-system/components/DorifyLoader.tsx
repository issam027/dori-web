import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { loginShowcaseKey, loginShowcaseSlides } from '@/core/content/login-showcase';

export function DorifyLoader({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const [messageIndex] = useState(() => Math.floor(Math.random() * loginShowcaseSlides.length));

  const message = loginShowcaseSlides[messageIndex] ?? loginShowcaseSlides[0];

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
      <p>{t(loginShowcaseKey(message, 'title'))}</p>
      <small>{t('common.loading')}</small>
    </div>
  );
}
