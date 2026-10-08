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
        title="Santé de la plateforme"
        description="État déclaré par l’API, actualisé automatiquement toutes les 30 secondes."
        actions={
          <div className="page-actions">
            <StatusBadge tone={healthy ? 'success' : 'danger'}>
              {healthy ? '● Opérationnelle' : '● Dégradée'}
            </StatusBadge>
            <button
              className="button"
              type="button"
              disabled={health.isFetching}
              onClick={() => void health.refetch()}
            >
              {health.isFetching ? 'Actualisation…' : '↻ Actualiser'}
            </button>
          </div>
        }
      />
      <div className="metric-grid">
        <Card>
          <span className="metric-label">État global</span>
          <StatusBadge tone={healthy ? 'success' : 'danger'}>
            {data?.status ?? 'indisponible'}
          </StatusBadge>
        </Card>
        <Card>
          <span className="metric-label">Base de données</span>
          <StatusBadge tone={data?.checks.database === 'up' ? 'success' : 'danger'}>
            {data?.checks.database ?? 'indisponible'}
          </StatusBadge>
        </Card>
        <Card>
          <span className="metric-label">Uptime</span>
          <strong className="metric-value">{data ? duration(data.uptime) : '—'}</strong>
        </Card>
        <Card>
          <span className="metric-label">Horodatage API</span>
          <strong>{data ? new Date(data.timestamp).toLocaleString() : '—'}</strong>
        </Card>
      </div>
      <div className="health-content-grid">
        <Card>
          <div className="card-heading">
            <div>
              <h2>Mémoire du processus</h2>
              <p>Valeurs exposées par le processus API au dernier contrôle.</p>
            </div>
            <span className="status-badge status-accent">Temps réel</span>
          </div>
          <dl className="health-grid">
            <dt>RSS</dt>
            <dd>{data ? bytes(data.checks.memoryUsage.rss) : '—'}</dd>
            <dt>Heap total</dt>
            <dd>{data ? bytes(data.checks.memoryUsage.heapTotal) : '—'}</dd>
            <dt>Heap utilisé</dt>
            <dd>{data ? bytes(data.checks.memoryUsage.heapUsed) : '—'}</dd>
            <dt>Mémoire externe</dt>
            <dd>{data ? bytes(data.checks.memoryUsage.external) : '—'}</dd>
            <dt>Array buffers</dt>
            <dd>{data ? bytes(data.checks.memoryUsage.arrayBuffers) : '—'}</dd>
          </dl>
        </Card>
        <Card>
          <div className="card-heading">
            <div>
              <h2>Périmètre supervisé</h2>
              <p>Le statut global dépend actuellement de PostgreSQL et du processus API.</p>
            </div>
          </div>
          <div className="health-check-list">
            <div>
              <span className="ticket-chip">API</span>
              <div>
                <strong>Processus applicatif</strong>
                <small>Uptime, horodatage et mémoire</small>
              </div>
              <StatusBadge tone={data ? 'success' : 'danger'}>
                {data ? 'Mesuré' : 'Indisponible'}
              </StatusBadge>
            </div>
            <div>
              <span className="ticket-chip">DB</span>
              <div>
                <strong>PostgreSQL</strong>
                <small>Contrôle de connectivité</small>
              </div>
              <StatusBadge tone={data?.checks.database === 'up' ? 'success' : 'danger'}>
                {data?.checks.database ?? 'down'}
              </StatusBadge>
            </div>
          </div>
          <div className="health-boundary">
            <strong>Non exposé par l’API actuelle</strong>
            <p>
              Workers, fournisseurs SMS/email, latence et historique d’incidents ne sont pas
              présentés comme supervisés.
            </p>
          </div>
        </Card>
      </div>
      <Card>
        <div className="card-heading">
          <div>
            <h2>Contrat de réponse</h2>
            <p>Données effectivement retournées par l’endpoint de santé.</p>
          </div>
          <span className="status-badge">Lecture seule</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Champ API</th>
                <th>Valeur</th>
                <th>Interprétation</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>status</code>
                </td>
                <td>{data?.status ?? '—'}</td>
                <td>État global du service</td>
              </tr>
              <tr>
                <td>
                  <code>checks.database</code>
                </td>
                <td>{data?.checks.database ?? '—'}</td>
                <td>Connectivité PostgreSQL</td>
              </tr>
              <tr>
                <td>
                  <code>uptime</code>
                </td>
                <td>{data ? `${String(data.uptime)} s` : '—'}</td>
                <td>Durée de vie du processus</td>
              </tr>
              <tr>
                <td>
                  <code>checks.memoryUsage</code>
                </td>
                <td>{data ? '5 compteurs' : '—'}</td>
                <td>Mémoire Node.js brute</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
