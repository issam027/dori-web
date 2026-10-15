import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import {
  Activity,
  CalendarDays,
  Check,
  Clock3,
  ListChecks,
  MonitorUp,
  UsersRound,
} from 'lucide-react';
import { useScopeStore } from '@/core/scope/scope-store';
import { Card, MetricCard } from '@/design-system/components/Card';
import { EmptyState, ErrorState } from '@/design-system/components/FeedbackState';
import { PageHeader } from '@/design-system/components/PageHeader';
import { StatusBadge } from '@/design-system/components/StatusBadge';
import { slaTone } from './sla';
import { useDashboardQueueLoad } from './hooks/useReports';
import { useQueueStatuses } from '@/features/queues/hooks/useQueues';
import { useDeskSession } from '@/features/queue-operations/hooks/useQueueOperations';

type PressureFilter = 'all' | 'danger' | 'warning' | 'healthy';

export function ControlRoomPage() {
  const { t } = useTranslation();
  const siteId = useScopeStore((state) => state.activeSiteId);
  const [selectedQueueIds, setSelectedQueueIds] = useState<number[]>([]);
  const [pressure, setPressure] = useState<PressureFilter>('all');
  const load = useDashboardQueueLoad(siteId);
  const items = load.data?.data ?? [];
  const queueIds = items.map((queue) => queue.queueId);
  const statuses = useQueueStatuses(queueIds);
  const { threads, sessions } = useDeskSession(null, queueIds);
  if (load.isError) return <ErrorState onRetry={() => void load.refetch()} />;

  const activeCounters = statuses.reduce(
    (sum, status) => sum + (status.data?.data.activeThreads ?? 0),
    0,
  );
  const totalCounters = threads.reduce((sum, thread) => sum + (thread.data?.data.total ?? 0), 0);
  const waitingTotal = items.reduce((sum, queue) => sum + queue.waitingCount, 0);
  const appointmentsToday = statuses.reduce(
    (sum, status) => sum + (status.data?.data.nextAppointments.length ?? 0),
    0,
  );
  const averageWait = statuses.length
    ? statuses.reduce((sum, status) => sum + (status.data?.data.estimatedWaitMinutes ?? 0), 0) /
      statuses.length
    : 0;
  const operational = items.map((queue, index) => {
    const status = statuses[index]?.data?.data;
    const tone = slaTone(queue.waitingCount, status?.estimatedWaitMinutes ?? 0);
    return {
      queue,
      status,
      tone,
      queueSessions: sessions[index]?.data?.data.items ?? [],
      totalThreads: threads[index]?.data?.data.total ?? queue.threadCount,
    };
  });
  const dangerCount = operational.filter((item) => item.tone === 'danger').length;
  const filtered = operational.filter(({ queue, tone }) => {
    const matchesSelection = !selectedQueueIds.length || selectedQueueIds.includes(queue.queueId);
    const matchesPressure =
      pressure === 'all' || (pressure === 'healthy' ? tone === 'success' : tone === pressure);
    return matchesSelection && matchesPressure;
  });
  const toggleQueue = (queueId: number) => {
    setSelectedQueueIds((current) =>
      current.includes(queueId) ? current.filter((id) => id !== queueId) : [...current, queueId],
    );
  };
  return (
    <div className="page-stack control-room-page">
      <PageHeader
        eyebrow={t('common.pilotage')}
        title={t('supervision.controlRoom.supervisionTempsReel')}
        description={t('controlRoom.liveDescription')}
        actions={
          <StatusBadge tone={dangerCount ? 'danger' : 'success'}>
            <Activity />
            {dangerCount
              ? t('controlRoom.attentionRequired', { count: dangerCount })
              : t('controlRoom.allOperational')}
          </StatusBadge>
        }
      />
      <div className="metric-grid control-room-metrics">
        {[
          { label: t('common.activeQueues'), value: items.length, icon: ListChecks },
          { label: t('common.waiting'), value: waitingTotal, icon: UsersRound },
          {
            label: t('common.activeCounters'),
            value: `${String(activeCounters)}/${totalCounters ? String(totalCounters) : '—'}`,
            icon: MonitorUp,
          },
          { label: t('common.todayAppointments'), value: appointmentsToday, icon: CalendarDays },
          {
            label: t('controlRoom.averageWait'),
            value: `${averageWait.toFixed(1)} ${t('common.min')}`,
            icon: Clock3,
          },
        ].map(({ label, value, icon: Icon }) => (
          <MetricCard key={label} label={label} value={value} icon={<Icon />} />
        ))}
      </div>
      <Card className="control-room-toolbar">
        <fieldset className="control-room-queue-picker">
          <legend>{t('controlRoom.selectQueues')}</legend>
          <div className="queue-choice-list">
            <button
              className={!selectedQueueIds.length ? 'active' : ''}
              type="button"
              aria-pressed={!selectedQueueIds.length}
              onClick={() => {
                setSelectedQueueIds([]);
              }}
            >
              <Check />
              {t('controlRoom.allQueues')}
            </button>
            {items.map((queue) => {
              const selected = selectedQueueIds.includes(queue.queueId);
              return (
                <button
                  key={queue.queueId}
                  className={selected ? 'active' : ''}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    toggleQueue(queue.queueId);
                  }}
                >
                  <Check />
                  <span>{queue.queueName}</span>
                  <small>{queue.queueCode}</small>
                </button>
              );
            })}
          </div>
        </fieldset>
        <div className="control-room-filter-row">
          <div
            className="segmented-control"
            role="group"
            aria-label={t('controlRoom.filterPressure')}
          >
            {(['all', 'danger', 'warning', 'healthy'] as const).map((value) => (
              <button
                key={value}
                className={pressure === value ? 'active' : ''}
                type="button"
                onClick={() => {
                  setPressure(value);
                }}
              >
                {t(`controlRoom.pressure.${value}`)}
              </button>
            ))}
          </div>
          <span className="muted">
            {selectedQueueIds.length
              ? t('controlRoom.selectedQueues', { count: selectedQueueIds.length })
              : t('controlRoom.allQueuesSelected')}
          </span>
          <span className="muted">
            {t('controlRoom.visibleQueues', { count: filtered.length, total: items.length })}
          </span>
        </div>
      </Card>
      {!load.isLoading && !filtered.length ? (
        <EmptyState
          title={
            items.length
              ? t('controlRoom.noMatchingQueue')
              : t('supervision.controlRoom.aucuneFileASuperviser')
          }
        />
      ) : (
        <div className="queue-card-grid supervision-grid">
          {filtered.map(({ queue, status, tone, queueSessions, totalThreads }) => (
            <Card key={queue.queueId} className={`supervision-queue-card supervision-${tone}`}>
              <div className="card-head">
                <div>
                  <span className="eyebrow">{queue.queueCode}</span>
                  <h2>{queue.queueName}</h2>
                </div>
                <StatusBadge tone={tone}>
                  {status?.estimatedWaitMinutes ?? '—'} {t('common.min')}
                </StatusBadge>
              </div>
              <div className="queue-live-stats">
                <div>
                  <strong>{queue.waitingCount}</strong>
                  <span>{t('common.waiting')}</span>
                </div>
                <div>
                  <strong>
                    {status?.activeThreads ?? 0}/{totalThreads}
                  </strong>
                  <span>{t('common.activeCounters')}</span>
                </div>
                <div>
                  <strong>{status?.nextAppointments.length ?? 0}</strong>
                  <span>{t('controlRoom.upcomingAppointments')}</span>
                </div>
              </div>
              <div className="queue-capacity">
                <span
                  style={{
                    width: `${String(totalThreads ? Math.min(100, ((status?.activeThreads ?? 0) / totalThreads) * 100) : 0)}%`,
                  }}
                />
              </div>
              {status?.nextAppointments[0] ? (
                <div className="next-appointment">
                  <CalendarDays />
                  <div>
                    <span>{t('controlRoom.nextAppointment')}</span>
                    <strong>
                      {new Date(status.nextAppointments[0].scheduledTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      · {status.nextAppointments[0].ticketNumber}
                    </strong>
                  </div>
                </div>
              ) : null}
              <div className="operator-section">
                <h3>{t('controlRoom.operatorSessions')}</h3>
                {queueSessions.length ? (
                  <ul className="operator-chips">
                    {queueSessions.map((session) => (
                      <li key={session.sessionId}>
                        <MonitorUp />
                        <span>
                          {session.counterName ||
                            `${t('common.guichet')} ${String(
                              session.threadNumber ?? t('supervision.controlRoom.flottant'),
                            )}`}
                        </span>
                        <strong>
                          {session.username ??
                            t('controlRoom.operatorReference', { value0: String(session.userId) })}
                        </strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">{t('controlRoom.noActiveSession')}</p>
                )}
              </div>
              {tone === 'danger' ? (
                <p className="alert-inline" role="alert">
                  {t('supervision.controlRoom.seuilLocalDeVigilanceDepasseVerifiezLaCha')}
                </p>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
