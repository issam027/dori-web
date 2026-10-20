import { useTranslation } from 'react-i18next';
import { DataTable } from '@/design-system/components/DataTable';
import { CalendarClock, Clock3, Database, HeartPulse } from 'lucide-react';
import { Card, MetricCard } from '@/design-system/components/Card';
import { ErrorState } from '@/design-system/components/FeedbackState';
import { PageHeader } from '@/design-system/components/PageHeader';
import { StatusBadge } from '@/design-system/components/StatusBadge';
import { APP_VERSION_LABEL } from '@/core/config/app-version';
import { formatDateTime } from '@/core/i18n/date-format';
import { useHealth } from './hooks/useHealth';

const bytes = (value: number) => `${(value / 1024 / 1024).toFixed(1)} MiB`;
const duration = (seconds: number) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${String(days)} j ${String(hours)} h ${String(minutes)} min`;
};

export function HealthPage() {
  const { t: __t, i18n } = useTranslation();
  const health = useHealth();
  if (health.isError && !health.data) return <ErrorState onRetry={() => void health.refetch()} />;
  const data = health.data;
  const healthy = data?.status === 'ok' && data.checks.database === 'up';
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
          label={__t('health.health.baseDeDonnees')}
          value={
            <StatusBadge tone={data?.checks.database === 'up' ? 'success' : 'danger'}>
              {data?.checks.database ?? __t('health.health.indisponible')}
            </StatusBadge>
          }
          icon={<Database />}
        />
        <MetricCard
          label={__t('health.uptime')}
          value={data ? duration(data.uptime) : '—'}
          icon={<Clock3 />}
        />
        <MetricCard
          label={__t('health.health.horodatageApi')}
          value={formatDateTime(data?.timestamp, i18n.language) ?? '—'}
          icon={<CalendarClock />}
        />
      </div>
      <div className="health-content-grid">
        <Card>
          <div className="card-heading">
            <div>
              <h2>{__t('health.health.memoireDuProcessus')}</h2>
              <p>{__t('health.health.valeursExposeesParLeProcessusApiAuDernier')}</p>
            </div>
            <span className="status-badge status-accent">{__t('health.health.tempsReel')}</span>
          </div>
          <dl className="health-grid">
            <dt>{__t('health.health.rss')}</dt>
            <dd>{data ? bytes(data.checks.memoryUsage.rss) : '—'}</dd>
            <dt>{__t('health.health.heapTotal')}</dt>
            <dd>{data ? bytes(data.checks.memoryUsage.heapTotal) : '—'}</dd>
            <dt>{__t('health.health.heapUtilise')}</dt>
            <dd>{data ? bytes(data.checks.memoryUsage.heapUsed) : '—'}</dd>
            <dt>{__t('health.health.memoireExterne')}</dt>
            <dd>{data ? bytes(data.checks.memoryUsage.external) : '—'}</dd>
            <dt>{__t('health.health.arrayBuffers')}</dt>
            <dd>{data ? bytes(data.checks.memoryUsage.arrayBuffers) : '—'}</dd>
          </dl>
        </Card>
        <Card>
          <div className="card-heading">
            <div>
              <h2>{__t('health.health.perimetreSupervise')}</h2>
              <p>{__t('health.health.leStatutGlobalDependActuellementDePostgres')}</p>
            </div>
          </div>
          <div className="health-check-list">
            <div>
              <span className="ticket-chip">{__t('common.api')}</span>
              <div>
                <strong>{__t('health.health.processusApplicatif')}</strong>
                <small>{__t('health.health.uptimeHorodatageEtMemoire')}</small>
              </div>
              <StatusBadge tone={data ? 'success' : 'danger'}>
                {data ? __t('health.health.mesure') : __t('health.unavailable')}
              </StatusBadge>
            </div>
            <div>
              <span className="ticket-chip">{__t('health.health.db')}</span>
              <div>
                <strong>{__t('health.health.postgresql')}</strong>
                <small>{__t('health.health.controleDeConnectivite')}</small>
              </div>
              <StatusBadge tone={data?.checks.database === 'up' ? 'success' : 'danger'}>
                {data?.checks.database ?? __t('health.health.down')}
              </StatusBadge>
            </div>
          </div>
          <div className="health-boundary">
            <strong>{__t('health.health.nonExposeParLApiActuelle')}</strong>
            <p>{__t('health.health.workersFournisseursSmsEmailLatenceEtHistor')}</p>
          </div>
        </Card>
      </div>
      <Card className="health-contract-card">
        <div className="card-heading">
          <div>
            <h2>{__t('health.health.contratDeReponse')}</h2>
            <p>{__t('health.health.donneesEffectivementRetourneesParLEndpoint')}</p>
          </div>
          <span className="status-badge">{__t('health.health.lectureSeule')}</span>
        </div>
        <DataTable caption={__t('health.health.donneesEffectivementRetourneesParLEndpoint')}>
          <thead>
            <tr>
              <th scope="col">{__t('health.health.champApi')}</th>
              <th scope="col">{__t('common.valeur')}</th>
              <th scope="col">{__t('health.health.interpretation')}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-label={__t('health.health.champApi')}>
                <code>{__t('health.health.status')}</code>
              </td>
              <td data-label={__t('common.valeur')}>{data?.status ?? '—'}</td>
              <td data-label={__t('health.health.interpretation')}>
                {__t('health.health.etatGlobalDuService')}
              </td>
            </tr>
            <tr>
              <td data-label={__t('health.health.champApi')}>
                <code>{__t('health.health.checksDatabase')}</code>
              </td>
              <td data-label={__t('common.valeur')}>{data?.checks.database ?? '—'}</td>
              <td data-label={__t('health.health.interpretation')}>
                {__t('health.health.connectivitePostgresql')}
              </td>
            </tr>
            <tr>
              <td data-label={__t('health.health.champApi')}>
                <code>{__t('health.health.uptime')}</code>
              </td>
              <td data-label={__t('common.valeur')}>
                {data
                  ? __t('health.durationSeconds', {
                      value0: String(data.uptime),
                    })
                  : '—'}
              </td>
              <td data-label={__t('health.health.interpretation')}>
                {__t('health.health.dureeDeVieDuProcessus')}
              </td>
            </tr>
            <tr>
              <td data-label={__t('health.health.champApi')}>
                <code>{__t('health.health.checksMemoryusage')}</code>
              </td>
              <td data-label={__t('common.valeur')}>{data ? __t('health.counterCount') : '—'}</td>
              <td data-label={__t('health.health.interpretation')}>
                {__t('health.health.memoireNodeJsBrute')}
              </td>
            </tr>
          </tbody>
        </DataTable>
      </Card>
    </div>
  );
}
