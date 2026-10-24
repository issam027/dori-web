import { useTranslation } from 'react-i18next';
import { CalendarClock, HeartPulse } from 'lucide-react';
import { Card, MetricCard } from '@/design-system/components/Card';
import { ErrorState } from '@/design-system/components/FeedbackState';
import { PageHeader } from '@/design-system/components/PageHeader';
import { StatusBadge } from '@/design-system/components/StatusBadge';
import { APP_VERSION_LABEL } from '@/core/config/app-version';
import { formatDateTime } from '@/core/i18n/date-format';
import { useHealth } from './hooks/useHealth';

export function HealthPage() {
  const { t: __t, i18n } = useTranslation();
  const health = useHealth();
  if (health.isError && !health.data) return <ErrorState onRetry={() => void health.refetch()} />;

  const data = health.data;
  const healthy = data?.status === 'ok';

  return (
    <div className="page-stack health-page">
      <PageHeader
        eyebrow={__t('nav.health')}
        title={__t('health.health.santeDeLaPlateforme')}
        description={__t('health.health.etatDeclareParLApiActualiseAutomatiquement')}
        actions={
          <div className="cluster">
            <StatusBadge>
              {__t('health.applicationVersion', { version: APP_VERSION_LABEL })}
            </StatusBadge>
            <StatusBadge tone={healthy ? 'success' : 'danger'}>
              {healthy ? __t('health.health.operationnelle') : __t('health.health.degradee')}
            </StatusBadge>
          </div>
        }
      />
      <div className="metric-grid">
        <MetricCard
          label={__t('health.health.etatGlobal')}
          value={
            <StatusBadge tone={healthy ? 'success' : 'danger'}>
              {data?.status ?? __t('health.health.indisponible')}
            </StatusBadge>
          }
          icon={<HeartPulse />}
        />
        <MetricCard
          label={__t('health.health.horodatageApi')}
          value={formatDateTime(data?.timestamp, i18n.language) ?? '—'}
          icon={<CalendarClock />}
        />
      </div>
      <Card className="health-contract-card">
        <div className="card-heading">
          <div>
            <h2>{__t('health.health.perimetreSupervise')}</h2>
            <p>{__t('health.health.donneesEffectivementRetourneesParLEndpoint')}</p>
          </div>
          <span className="status-badge">{__t('health.health.lectureSeule')}</span>
        </div>
        <div className="health-boundary">
          <strong>{__t('health.health.nonExposeParLApiActuelle')}</strong>
          <p>{__t('health.health.workersFournisseursSmsEmailLatenceEtHistor')}</p>
        </div>
      </Card>
    </div>
  );
}
