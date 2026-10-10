import { useTranslation } from 'react-i18next';
import { useState } from 'react';
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
import { notify } from '@/core/notifications/notification-store';
import { useDashboardQueueLoad, useDashboardSummary } from './hooks/useReports';
import { useRecentNotifications } from './hooks/useNotifications';
import { useQueueStatuses } from '@/features/queues/hooks/useQueues';
import { useDeskSession } from '@/features/queue-operations/hooks/useQueueOperations';
import { useResetQueue } from './hooks/useControlRoom';

export function ControlRoomPage() {
  const { t: __t } = useTranslation();
  const siteId = useScopeStore((s) => s.activeSiteId);
  const user = useSessionStore((s) => s.user);
  const [resetQueue, setResetQueue] = useState<{ id: number; name: string }>();
  const load = useDashboardQueueLoad(siteId);
  const summary = useDashboardSummary(siteId);
  const items = load.data?.data ?? [];
  const queueIds = items.map((queue) => queue.queueId);
  const statuses = useQueueStatuses(queueIds);
  const { threads, sessions } = useDeskSession(null, queueIds);
  const notifications = useRecentNotifications();
  const reset = useResetQueue(() => {
      const queueName = resetQueue?.name;
      setResetQueue(undefined);
      notify({
        tone: 'success',
        title: __t('notifications.queue.reset'),
        message: queueName
          ? __t('notifications.queue.resetMessage', { queue: queueName })
          : undefined,
      });
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
        title={__t('ui.supervision.control_room_page.supervision_temps_reel_1phf055')}
        description={__t(
          'ui.supervision.control_room_page.charge_guichets_sessions_et_alertes_issues_de_l__145vd08',
        )}
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
        <EmptyState
          title={__t('ui.supervision.control_room_page.aucune_file_a_superviser_nfwqyo')}
        />
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
                    {__t('ui.supervision.control_room_page.sla_jzx5rl')}
                    {status?.estimatedWaitMinutes ?? '—'}{' '}
                    {__t('ui.supervision.control_room_page.min_1jxbmtz')}
                  </StatusBadge>
                </div>
                <div className="queue-load">
                  <strong>{queue.waitingCount}</strong>
                  <span>
                    {__t('ui.supervision.control_room_page.en_attente_forfait_dominant_qg8jh9')}
                    {queue.dominantTier}
                  </span>
                </div>
                <p>
                  {status?.activeThreads ?? 0}{' '}
                  {__t('ui.supervision.control_room_page.guichet_s_actif_s_9ozuae')}
                  {queueSessions.length} {__t('ui.supervision.control_room_page.session_s_1mascuh')}
                </p>
                {queueSessions.length ? (
                  <ul className="compact-list">
                    {queueSessions.map((session) => (
                      <li key={session.sessionId}>
                        {__t('ui.supervision.control_room_page.guichet_15ztv8y')}
                        {session.threadNumber ??
                          __t('ui.expression.supervision.control_room_page.flottant_1p6rb7l')}{' '}
                        ·{' '}
                        {session.username ??
                          __t(
                            'ui.expression.supervision.control_room_page.operateur_value0_117wv0a',
                            { value0: String(session.userId) },
                          )}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {tone === 'danger' ? (
                  <p className="alert-inline" role="alert">
                    {__t(
                      'ui.supervision.control_room_page.seuil_local_de_vigilance_depasse_verifiez_la_cha_1prw58b',
                    )}
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
                    {__t('ui.supervision.control_room_page.reinitialisation_d_urgence_1tnfw2n')}
                  </button>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
      <Card>
        <h2>{__t('ui.supervision.control_room_page.notifications_recentes_vf482q')}</h2>
        <ul className="compact-list">
          {notifications.data?.data.items.map((notification) => (
            <li key={notification.notificationId}>
              <strong>
                {notification.ticketNumber ??
                  __t('ui.expression.supervision.control_room_page.value0_g7s8cl', {
                    value0: String(notification.registrationId),
                  })}
              </strong>{' '}
              · {notification.channel.toUpperCase()}{' '}
              {__t('ui.supervision.control_room_page.vers_1r1ik4j')}
              {maskRecipient(notification.recipient)} ·{' '}
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
        title={__t('ui.supervision.control_room_page.reinitialisation_d_urgence_1tnfw2n')}
        description={`La file « ${resetQueue?.name ?? ''} » sera réinitialisée. Les inscriptions en attente du jour seront clôturées selon le mode configuré côté serveur. Cette action ne peut pas être annulée.`}
        confirmLabel={reset.isPending ? 'Réinitialisation…' : 'Confirmer la réinitialisation'}
        destructive
        onConfirm={() => {
          if (resetQueue) reset.run(resetQueue.id);
        }}
      />
    </div>
  );
}
