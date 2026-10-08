import { useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsControllerFindNotifications } from '@/api/generated/notifications/notifications';
import {
  queueEngineControllerGetActiveSessions,
  queueEngineControllerGetThreads,
} from '@/api/generated/queue-engine/queue-engine';
import { queuesControllerGetStatus, queuesControllerReset } from '@/api/generated/queues/queues';
import {
  reportsControllerGetDashboardQueueLoad,
  reportsControllerGetDashboardSummary,
} from '@/api/generated/reports/reports';
import { useSessionStore } from '@/core/auth/session-store';
import { hasPermission } from '@/core/permissions/permissions';
import { useScopeStore } from '@/core/scope/scope-store';
import { Card } from '@/design-system/components/Card';
import { EmptyState, ErrorState } from '@/design-system/components/FeedbackState';
import { ConfirmDialog } from '@/design-system/components/Modal';
import { PageHeader } from '@/design-system/components/PageHeader';
import { StatusBadge } from '@/design-system/components/StatusBadge';
import { maskRecipient } from './notification-utils';
import { slaTone } from './sla';

export function ControlRoomPage() {
  const siteId = useScopeStore((s) => s.activeSiteId);
  const user = useSessionStore((s) => s.user);
  const client = useQueryClient();
  const [resetQueue, setResetQueue] = useState<{ id: number; name: string }>();
  const load = useQuery({
    queryKey: ['reports', 'load', siteId],
    queryFn: () =>
      reportsControllerGetDashboardQueueLoad({ siteId: siteId ?? undefined, limit: 100 }),
    enabled: siteId !== null,
    refetchInterval: 15000,
  });
  const summary = useQuery({
    queryKey: ['reports', 'summary', siteId],
    queryFn: () => reportsControllerGetDashboardSummary({ siteId: siteId ?? undefined }),
    enabled: siteId !== null,
    refetchInterval: 15000,
  });
  const items = load.data?.data ?? [];
  const statuses = useQueries({
    queries: items.map((queue) => ({
      queryKey: ['queue-status', queue.queueId],
      queryFn: () => queuesControllerGetStatus(queue.queueId),
      refetchInterval: 15000,
    })),
  });
  const threads = useQueries({
    queries: items.map((queue) => ({
      queryKey: ['threads', queue.queueId],
      queryFn: () => queueEngineControllerGetThreads(queue.queueId, { page: 1, pageSize: 100 }),
      refetchInterval: 15000,
    })),
  });
  const sessions = useQueries({
    queries: items.map((queue) => ({
      queryKey: ['queue-sessions', queue.queueId],
      queryFn: () =>
        queueEngineControllerGetActiveSessions(queue.queueId, { page: 1, pageSize: 100 }),
      refetchInterval: 15000,
    })),
  });
  const notifications = useQuery({
    queryKey: ['notifications', 'control-room'],
    queryFn: () =>
      notificationsControllerFindNotifications({ page: 1, pageSize: 5, sort: 'createdAt:desc' }),
    refetchInterval: 15000,
  });
  const reset = useMutation({
    mutationFn: (queueId: number) => queuesControllerReset(queueId),
    onSuccess: async () => {
      setResetQueue(undefined);
      await client.invalidateQueries({ queryKey: ['queue'] });
      await client.invalidateQueries({ queryKey: ['reports'] });
    },
  });
  if (load.isError || summary.isError)
    return <ErrorState onRetry={() => void Promise.all([load.refetch(), summary.refetch()])} />;
  const activeCounters = statuses.reduce(
    (sum, status) => sum + (status.data?.data.activeThreads ?? 0),
    0,
  );
  const totalCounters = threads.reduce((sum, thread) => sum + (thread.data?.data.total ?? 0), 0);
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Pilotage"
        title="Supervision temps réel"
        description="Charge, guichets, sessions et alertes issues de l’API, actualisées toutes les 15 secondes."
      />
      <div className="metric-grid">
        {[
          ['Files actives', summary.data?.data.activeQueues],
          ['En attente', summary.data?.data.waitingTotal],
          [
            'Guichets actifs',
            `${String(activeCounters)}/${totalCounters ? String(totalCounters) : '—'}`,
          ],
          ['Rendez-vous du jour', summary.data?.data.appointmentsToday],
        ].map(([label, value]) => (
          <Card key={label}>
            <span className="metric-label">{label}</span>
            <strong className="metric-value">{value ?? '—'}</strong>
          </Card>
        ))}
      </div>
      {!load.isLoading && !items.length ? (
        <EmptyState title="Aucune file à superviser" />
      ) : (
        <div className="queue-card-grid">
          {items.map((queue, index) => {
            const status = statuses[index]?.data?.data;
            const tone = slaTone(queue.waitingCount, status?.estimatedWaitMinutes ?? 0);
            const queueSessions = sessions[index]?.data?.data.items ?? [];
            return (
              <Card key={queue.queueId}>
                <div className="card-head">
                  <div>
                    <span className="eyebrow">
                      {queue.queueCode} · {queue.siteName}
                    </span>
                    <h2>{queue.queueName}</h2>
                  </div>
                  <StatusBadge tone={tone}>
                    SLA {status?.estimatedWaitMinutes ?? '—'} min
                  </StatusBadge>
                </div>
                <div className="queue-load">
                  <strong>{queue.waitingCount}</strong>
                  <span>en attente · forfait dominant {queue.dominantTier}</span>
                </div>
                <p>
                  {status?.activeThreads ?? 0} guichet(s) actif(s) · {queueSessions.length}{' '}
                  session(s)
                </p>
                {queueSessions.length ? (
                  <ul className="compact-list">
                    {queueSessions.map((session) => (
                      <li key={session.sessionId}>
                        Guichet {session.threadNumber ?? 'flottant'} ·{' '}
                        {session.username ?? `opérateur #${String(session.userId)}`}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {tone === 'danger' ? (
                  <p className="alert-inline" role="alert">
                    Seuil local de vigilance dépassé : vérifiez la charge de cette file.
                  </p>
                ) : null}
                {hasPermission(user, 'queue_edit') ? (
                  <button
                    className="button button-danger"
                    type="button"
                    onClick={() => {
                      setResetQueue({ id: queue.queueId, name: queue.queueName });
                    }}
                  >
                    Réinitialisation d’urgence
                  </button>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
      <Card>
        <h2>Notifications récentes</h2>
        <ul className="compact-list">
          {notifications.data?.data.items.map((notification) => (
            <li key={notification.notificationId}>
              <strong>
                {notification.ticketNumber ?? `#${String(notification.registrationId)}`}
              </strong>{' '}
              · {notification.channel.toUpperCase()} vers {maskRecipient(notification.recipient)} ·{' '}
              <StatusBadge
                tone={
                  notification.notificationStatus === 'failed'
                    ? 'danger'
                    : notification.notificationStatus === 'delivered'
                      ? 'success'
                      : 'warning'
                }
              >
                {notification.notificationStatus}
              </StatusBadge>
            </li>
          ))}
        </ul>
      </Card>
      <ConfirmDialog
        open={Boolean(resetQueue)}
        onOpenChange={(open) => {
          if (!open) setResetQueue(undefined);
        }}
        title="Réinitialisation d’urgence"
        description={`La file « ${resetQueue?.name ?? ''} » sera réinitialisée. Les inscriptions en attente du jour seront clôturées selon le mode configuré côté serveur. Cette action ne peut pas être annulée.`}
        confirmLabel={reset.isPending ? 'Réinitialisation…' : 'Confirmer la réinitialisation'}
        destructive
        onConfirm={() => {
          if (resetQueue) reset.mutate(resetQueue.id);
        }}
      />
    </div>
  );
}
