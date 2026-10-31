import { useTranslation } from 'react-i18next';
import { Bot, CalendarClock, Cloud, HeartPulse } from 'lucide-react';
import { Card, MetricCard } from '@/design-system/components/Card';
import { ErrorState } from '@/design-system/components/FeedbackState';
import { PageHeader } from '@/design-system/components/PageHeader';
import { StatusBadge } from '@/design-system/components/StatusBadge';
import { APP_VERSION_LABEL } from '@/core/config/app-version';
import { formatDateTime } from '@/core/i18n/date-format';
import { useAgentStatus, useHealth } from './hooks/useHealth';
import { isCloudDeployment } from '@/core/config/deployment-mode';

export function HealthPage() {
  const { t: __t, i18n } = useTranslation();
  const health = useHealth();
  const agentStatus = useAgentStatus();
  if (health.isError && !health.data) return <ErrorState onRetry={() => void health.refetch()} />;

  const data = health.data;
  const healthy = data?.status === 'ok';
  const agent = agentStatus.data?.data;

  return (
    <div className="page-stack health-page">
      <PageHeader
        eyebrow={__t('nav.health')}
        title={__t('health.health.santeDeLaPlateforme')}
        description={
          <>
            {__t('health.health.etatDeclareParLApiActualiseAutomatiquement')} ·{' '}
            {__t('health.applicationVersion', { version: APP_VERSION_LABEL })}
          </>
        }
        status={
          <StatusBadge tone={healthy ? 'success' : 'danger'}>
            {healthy ? __t('health.health.operationnelle') : __t('health.health.degradee')}
          </StatusBadge>
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
        {!isCloudDeployment ? (
          <MetricCard
            label={__t('health.agent.status')}
            value={
              <StatusBadge tone={agent?.configured ? 'success' : 'warning'}>
                {agent?.configured
                  ? __t('health.agent.configured')
                  : __t('health.agent.notConfigured')}
              </StatusBadge>
            }
            icon={<Bot />}
          />
        ) : null}
        {!isCloudDeployment ? (
          <MetricCard
            label={__t('health.agent.cloudConnectivity')}
            value={
              <StatusBadge tone={agent?.cloudReachability === 'connected' ? 'success' : 'warning'}>
                {__t(`health.agent.reachability.${agent?.cloudReachability ?? 'unreachable'}`)}
              </StatusBadge>
            }
            icon={<Cloud />}
          />
        ) : null}
      </div>
      {!isCloudDeployment && agent ? (
        <Card className="health-contract-card">
          <div className="card-heading">
            <div>
              <h2>{__t('health.agent.title')}</h2>
              <p>{__t('health.agent.description')}</p>
            </div>
            <StatusBadge tone={agent.deploymentStatus === 'active' ? 'success' : 'danger'}>
              {__t(`edge.deploymentStatus.${agent.deploymentStatus}`)}
            </StatusBadge>
          </div>
          <div className="health-boundary">
            <strong>{__t('health.agent.lastCloudContact')}</strong>
            <p>{formatDateTime(agent.lastCloudSuccessAt, i18n.language) ?? '—'}</p>
            {agent.lastCloudError ? <p>{agent.lastCloudError}</p> : null}
          </div>
        </Card>
      ) : null}
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
