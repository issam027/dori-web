import { CalendarClock, CheckCircle2, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function CockpitCalmState({
  activeCalls,
  appointments,
  canViewAppointments,
  hidden,
}: {
  activeCalls: number;
  appointments: number;
  canViewAppointments: boolean;
  hidden: boolean;
}) {
  const { t } = useTranslation();
  return (
    <section
      hidden={hidden}
      className="cockpit-recommendations cockpit-calm-state"
      aria-labelledby="cockpit-calm-title"
    >
      <div className="cockpit-section-heading">
        <div>
          <p className="eyebrow">{t('cockpit.operationalGuidance')}</p>
          <h2 id="cockpit-calm-title">{t('cockpit.calmTitle')}</h2>
        </div>
        <CheckCircle2 aria-hidden="true" />
      </div>
      <div>
        <article role="status">
          {appointments > 0 ? <CalendarClock aria-hidden="true" /> : <Users aria-hidden="true" />}
          <div>
            <strong>{t('cockpit.calmBody')}</strong>
            <span>{t(activeCalls > 0 ? 'cockpit.calmActive' : 'cockpit.calmNext')}</span>
            {appointments > 0 ? (
              <span>{t('cockpit.calmAppointments', { count: appointments })}</span>
            ) : null}
          </div>
          {appointments > 0 && canViewAppointments ? (
            <Link className="button" to="/appointments">
              {t('cockpit.calmAgenda')}
            </Link>
          ) : null}
        </article>
      </div>
    </section>
  );
}
