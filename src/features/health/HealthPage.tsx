import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { healthControllerCheck } from '@/api/generated/health/health';
import { Card } from '@/design-system/components/Card';
import { ErrorState } from '@/design-system/components/FeedbackState';
import { PageHeader } from '@/design-system/components/PageHeader';
import { StatusBadge } from '@/design-system/components/StatusBadge';

const bytes = (value: number) => `${(value / 1024 / 1024).toFixed(1)} MiB`;
const duration = (seconds: number) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${String(days)} j ${String(hours)} h ${String(minutes)} min`;
};

export function HealthPage() {
  const { t: __t } = useTranslation();
  const health = useQuery({
    queryKey: ['health'],
    queryFn: healthControllerCheck,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
  if (health.isError && !health.data) return <ErrorState onRetry={() => void health.refetch()} />;
  const data = health.data;
  const healthy = data?.status === 'ok' && data.checks.database === 'up';
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Infrastructure"
        title={__t('ui.health.health_page.sante_de_la_plateforme_1bakll9')}
        description={__t(
          'ui.health.health_page.etat_declare_par_l_api_actualise_automatiquement_6yt1yk',
        )}
        actions={
          <StatusBadge tone={healthy ? 'success' : 'danger'}>
            {healthy
              ? __t('ui.expression.health.health_page.operationnelle_up74kh')
              : __t('ui.expression.health.health_page.degradee_12ojy1n')}
          </StatusBadge>
        }
      />
      <div className="metric-grid">
        <Card>
          <span className="metric-label">{__t('ui.health.health_page.etat_global_1kkjvdg')}</span>
          <StatusBadge tone={healthy ? 'success' : 'danger'}>
            {data?.status ?? __t('ui.expression.health.health_page.indisponible_hivkzn')}
          </StatusBadge>
        </Card>
        <Card>
          <span className="metric-label">
            {__t('ui.health.health_page.base_de_donnees_uwc5u7')}
          </span>
          <StatusBadge tone={data?.checks.database === 'up' ? 'success' : 'danger'}>
            {data?.checks.database ?? __t('ui.expression.health.health_page.indisponible_hivkzn')}
          </StatusBadge>
        </Card>
        <Card>
          <span className="metric-label">{__t('ui.health.health_page.uptime_ijqnzt')}</span>
          <strong className="metric-value">{data ? duration(data.uptime) : '—'}</strong>
        </Card>
        <Card>
          <span className="metric-label">
            {__t('ui.health.health_page.horodatage_api_1xb5lwz')}
          </span>
          <strong>{data ? new Date(data.timestamp).toLocaleString() : '—'}</strong>
        </Card>
      </div>
      <div className="health-content-grid">
        <Card>
          <div className="card-heading">
            <div>
              <h2>{__t('ui.health.health_page.memoire_du_processus_mm6etv')}</h2>
              <p>
                {__t(
                  'ui.health.health_page.valeurs_exposees_par_le_processus_api_au_dernier_1jkutlk',
                )}
              </p>
            </div>
            <span className="status-badge status-accent">
              {__t('ui.health.health_page.temps_reel_hmrfts')}
            </span>
          </div>
          <dl className="health-grid">
            <dt>{__t('ui.health.health_page.rss_vtu0r7')}</dt>
            <dd>{data ? bytes(data.checks.memoryUsage.rss) : '—'}</dd>
            <dt>{__t('ui.health.health_page.heap_total_mj5a5x')}</dt>
            <dd>{data ? bytes(data.checks.memoryUsage.heapTotal) : '—'}</dd>
            <dt>{__t('ui.health.health_page.heap_utilise_5txly0')}</dt>
            <dd>{data ? bytes(data.checks.memoryUsage.heapUsed) : '—'}</dd>
            <dt>{__t('ui.health.health_page.memoire_externe_34c41q')}</dt>
            <dd>{data ? bytes(data.checks.memoryUsage.external) : '—'}</dd>
            <dt>{__t('ui.health.health_page.array_buffers_bs4shp')}</dt>
            <dd>{data ? bytes(data.checks.memoryUsage.arrayBuffers) : '—'}</dd>
          </dl>
        </Card>
        <Card>
          <div className="card-heading">
            <div>
              <h2>{__t('ui.health.health_page.perimetre_supervise_1cbfyl')}</h2>
              <p>
                {__t(
                  'ui.health.health_page.le_statut_global_depend_actuellement_de_postgres_a5lji9',
                )}
              </p>
            </div>
          </div>
          <div className="health-check-list">
            <div>
              <span className="ticket-chip">{__t('ui.health.health_page.api_y14yjr')}</span>
              <div>
                <strong>{__t('ui.health.health_page.processus_applicatif_1tcjqxp')}</strong>
                <small>{__t('ui.health.health_page.uptime_horodatage_et_memoire_m53v08')}</small>
              </div>
              <StatusBadge tone={data ? 'success' : 'danger'}>
                {data
                  ? __t('ui.expression.health.health_page.mesure_d9esly')
                  : __t('ui.expression.health.health_page.indisponible_m9mk9v')}
              </StatusBadge>
            </div>
            <div>
              <span className="ticket-chip">{__t('ui.health.health_page.db_f7g2v7')}</span>
              <div>
                <strong>{__t('ui.health.health_page.postgresql_11caiz7')}</strong>
                <small>{__t('ui.health.health_page.controle_de_connectivite_spmht2')}</small>
              </div>
              <StatusBadge tone={data?.checks.database === 'up' ? 'success' : 'danger'}>
                {data?.checks.database ?? __t('ui.expression.health.health_page.down_h4k3yt')}
              </StatusBadge>
            </div>
          </div>
          <div className="health-boundary">
            <strong>{__t('ui.health.health_page.non_expose_par_l_api_actuelle_488adz')}</strong>
            <p>
              {__t('ui.health.health_page.workers_fournisseurs_sms_email_latence_et_histor_v5o4gu')}
            </p>
          </div>
        </Card>
      </div>
      <Card>
        <div className="card-heading">
          <div>
            <h2>{__t('ui.health.health_page.contrat_de_reponse_iudjep')}</h2>
            <p>
              {__t(
                'ui.health.health_page.donnees_effectivement_retournees_par_l_endpoint__1xlr98r',
              )}
            </p>
          </div>
          <span className="status-badge">{__t('ui.health.health_page.lecture_seule_1tjh1vd')}</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{__t('ui.health.health_page.champ_api_1xi9gk0')}</th>
                <th>{__t('ui.health.health_page.valeur_oyhka0')}</th>
                <th>{__t('ui.health.health_page.interpretation_rnzhjb')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>{__t('ui.health.health_page.status_1fouhgv')}</code>
                </td>
                <td>{data?.status ?? '—'}</td>
                <td>{__t('ui.health.health_page.etat_global_du_service_1g92iqs')}</td>
              </tr>
              <tr>
                <td>
                  <code>{__t('ui.health.health_page.checks_database_13elakb')}</code>
                </td>
                <td>{data?.checks.database ?? '—'}</td>
                <td>{__t('ui.health.health_page.connectivite_postgresql_14026uc')}</td>
              </tr>
              <tr>
                <td>
                  <code>{__t('ui.health.health_page.uptime_1y4vs9l')}</code>
                </td>
                <td>
                  {data
                    ? __t('ui.expression.health.health_page.value0_s_17ykquz', {
                        value0: String(data.uptime),
                      })
                    : '—'}
                </td>
                <td>{__t('ui.health.health_page.duree_de_vie_du_processus_1dm7r85')}</td>
              </tr>
              <tr>
                <td>
                  <code>{__t('ui.health.health_page.checks_memoryusage_rtinkk')}</code>
                </td>
                <td>{data ? __t('ui.expression.health.health_page.5_compteurs_ak74vk') : '—'}</td>
                <td>{__t('ui.health.health_page.memoire_node_js_brute_3zrbsm')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
