import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSessionStore } from '@/core/auth/session-store';
import { findFirstAuthorizedPath } from '@/core/permissions/route-access';
import { legalConfig } from './legal-config';

interface LegalLocationState {
  from?: string;
}

export function LegalPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSessionStore((state) => state.user);
  const candidate = (location.state as LegalLocationState | null)?.from;
  const destination =
    candidate?.startsWith('/') && !candidate.startsWith('/legal')
      ? candidate
      : user
        ? findFirstAuthorizedPath(user)
        : '/login';
  return (
    <article className="legal-page">
      <button
        type="button"
        className="button"
        onClick={() => {
          void navigate(destination, { replace: true });
        }}
      >
        {t('legal.back')}
      </button>
      <header>
        <p className="eyebrow">{t('legal.eyebrow')}</p>
        <h1>{t('legal.title')}</h1>
        <p>{t('legal.updated')}</p>
      </header>
      <section>
        <h2>{t('legal.publisher')}</h2>
        <dl className="detail-list">
          <dt>{t('legal.entity')}</dt>
          <dd>{legalConfig.entityName}</dd>
          <dt>{t('legal.address')}</dt>
          <dd>{legalConfig.address}</dd>
          <dt>{t('legal.email')}</dt>
          <dd>
            <a href={`mailto:${legalConfig.email}`}>{legalConfig.email}</a>
          </dd>
          <dt>{t('legal.registration')}</dt>
          <dd>{legalConfig.registration}</dd>
        </dl>
      </section>
      <section>
        <h2>{t('legal.privacy')}</h2>
        <p>{t('legal.privacyText')}</p>
      </section>
      <section>
        <h2>{t('legal.rights')}</h2>
        <p>{t('legal.rightsText', { email: legalConfig.email })}</p>
      </section>
      <section>
        <h2>{t('legal.cookies')}</h2>
        <p>{t('legal.cookiesText')}</p>
      </section>
      <section>
        <h2>{t('legal.security')}</h2>
        <p>{t('legal.securityText')}</p>
      </section>
    </article>
  );
}
