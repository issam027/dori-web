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
      <header className="legal-hero">
        <div>
          <p className="eyebrow">{t('legal.eyebrow')}</p>
          <h1>{t('legal.title')}</h1>
          <p>{t('legal.updated')}</p>
        </div>
        <button
          type="button"
          className="button"
          onClick={() => {
            void navigate(destination, { replace: true });
          }}
        >
          {t('legal.back')}
        </button>
      </header>
      <div className="legal-summary" role="note">
        <span className="status-badge status-success">{t('legal.summarySecure')}</span>
        <span className="status-badge status-info">{t('legal.summarySaas')}</span>
        <p>{t('legal.introduction')}</p>
      </div>
      <nav className="legal-toc" aria-label={t('legal.contents')}>
        <a href="#publisher">{t('legal.publisher')}</a>
        <a href="#service">{t('legal.service')}</a>
        <a href="#privacy">{t('legal.privacy')}</a>
        <a href="#retention">{t('legal.retention')}</a>
        <a href="#security">{t('legal.security')}</a>
      </nav>
      <section id="publisher">
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
      <section id="service">
        <h2>{t('legal.service')}</h2>
        <p>{t('legal.serviceText')}</p>
      </section>
      <section id="privacy">
        <h2>{t('legal.privacy')}</h2>
        <p>{t('legal.privacyText')}</p>
        <h3>{t('legal.purposes')}</h3>
        <p>{t('legal.purposesText')}</p>
      </section>
      <section>
        <h2>{t('legal.rights')}</h2>
        <p>{t('legal.rightsText', { email: legalConfig.email })}</p>
      </section>
      <section>
        <h2>{t('legal.cookies')}</h2>
        <p>{t('legal.cookiesText')}</p>
      </section>
      <section id="retention">
        <h2>{t('legal.retention')}</h2>
        <p>{t('legal.retentionText')}</p>
      </section>
      <section id="security">
        <h2>{t('legal.security')}</h2>
        <p>{t('legal.securityText')}</p>
      </section>
      <footer className="legal-contact">
        <strong>{t('legal.contactTitle')}</strong>
        <p>{t('legal.contactText', { email: legalConfig.email })}</p>
        <a className="button button-primary" href={`mailto:${legalConfig.email}`}>
          {legalConfig.email}
        </a>
      </footer>
    </article>
  );
}
