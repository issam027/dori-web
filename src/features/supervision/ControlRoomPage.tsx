import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  AlertTriangle,
  CalendarRange,
  Check,
  Clock3,
  Info,
  ListChecks,
  MonitorUp,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  UsersRound,
} from 'lucide-react';
import { useSessionStore } from '@/core/auth/session-store';
import { hasPermission } from '@/core/permissions/permissions';
import { useScopeStore } from '@/core/scope/scope-store';
import { notify } from '@/core/notifications/notification-store';
import { Card, MetricCard } from '@/design-system/components/Card';
import { EmptyState, ErrorState } from '@/design-system/components/FeedbackState';
import { PageHeader } from '@/design-system/components/PageHeader';
import { StatusBadge } from '@/design-system/components/StatusBadge';
import { ConfirmDialog } from '@/design-system/components/Modal';
import { ControlRoomInsights } from './ControlRoomInsights';
import { slaTone } from './sla';
import { useMonitoringLive, useMonitoringSeries, useResetQueue } from './hooks/useControlRoom';
import { Button } from '@/design-system/components/Button';

type PressureFilter = 'all' | 'danger' | 'warning' | 'healthy';
type Period = '2h' | '8h' | 'today' | '24h' | '7d';
type RefreshInterval = false | 30_000 | 60_000 | 300_000;

const refreshIntervals = {
  off: false,
  '30s': 30_000,
  '1m': 60_000,
  '5m': 300_000,
} as const satisfies Record<string, RefreshInterval>;

function refreshIntervalKey(value: RefreshInterval): keyof typeof refreshIntervals {
  if (value === 30_000) return '30s';
  if (value === 60_000) return '1m';
  if (value === 300_000) return '5m';
  return 'off';
}

function periodRange(period: Period, now: number) {
  const to = new Date(now);
  const from = new Date(to);
  if (period === 'today') from.setHours(0, 0, 0, 0);
  else
    from.setTime(to.getTime() - { '2h': 2, '8h': 8, '24h': 24, '7d': 24 * 7 }[period] * 3_600_000);
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    bucket: period === '7d' ? ('day' as const) : ('hour' as const),
  };
}

function uniqueOperatorsByUser<T extends { userId: number }>(operators: readonly T[]): T[] {
  return Array.from(new Map(operators.map((operator) => [operator.userId, operator])).values());
}

export function ControlRoomPage() {
  const { t, i18n } = useTranslation();
  const siteId = useScopeStore((state) => state.activeSiteId);
  const canResetQueue = hasPermission(
    useSessionStore((state) => state.user),
    'queue_reset',
  );
  const [selectedQueueIds, setSelectedQueueIds] = useState<number[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [pressure, setPressure] = useState<PressureFilter>('all');
  const [period, setPeriod] = useState<Period>('8h');
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(false);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [rangeAnchor, setRangeAnchor] = useState(() => Date.now());
  const [resetTarget, setResetTarget] = useState<{ queueId: number; queueName: string }>();
  const range = useMemo(() => periodRange(period, rangeAnchor), [period, rangeAnchor]);
  useEffect(() => {
    if (!refreshInterval) return;
    const interval = window.setInterval(() => {
      setRangeAnchor(Date.now());
    }, refreshInterval);
    return () => {
      window.clearInterval(interval);
    };
  }, [refreshInterval]);
  const live = useMonitoringLive(siteId, refreshInterval);
  const snapshot = live.data?.data;
  const items = snapshot?.queues ?? [];
  const uniqueOperators = uniqueOperatorsByUser(snapshot?.operators ?? []);
  const series = useMonitoringSeries({
    siteId,
    queueIds: selectedQueueIds,
    userIds: selectedUserIds,
    ...range,
    timezone: snapshot?.timezone,
  });
  const resetQueue = useResetQueue(() => {
    if (resetTarget)
      notify({
        tone: 'success',
        title: t('notifications.queue.reset'),
        message: t('notifications.queue.resetMessage', { queue: resetTarget.queueName }),
      });
    setResetTarget(undefined);
  });
  if (live.isError) return <ErrorState onRetry={() => void live.refetch()} />;
  const operational = items.map((queue) => ({
    queue,
    tone: slaTone(queue.waiting, queue.estimatedWaitMinutes ?? 0),
    operators: uniqueOperatorsByUser(
      snapshot?.operators.filter((operator) => operator.queueIds.includes(queue.queueId)) ?? [],
    ),
  }));
  const dangerCount = operational.filter((item) => item.tone === 'danger').length;
  const queueNames = new Map(items.map((queue) => [queue.queueId, queue.queueName]));
  const alertCounts = (snapshot?.alerts ?? []).reduce<
    Record<'critical' | 'warning' | 'info', number>
  >((counts, alert) => ({ ...counts, [alert.severity]: counts[alert.severity] + 1 }), {
    critical: 0,
    warning: 0,
    info: 0,
  });
  const filtered = operational.filter(
    ({ queue, tone, operators }) =>
      (!selectedQueueIds.length || selectedQueueIds.includes(queue.queueId)) &&
      (!selectedUserIds.length ||
        operators.some((operator) => selectedUserIds.includes(operator.userId))) &&
      (pressure === 'all' || (pressure === 'healthy' ? tone === 'success' : tone === pressure)),
  );
  const toggle = (values: number[], value: number, setter: (next: number[]) => void) => {
    setter(values.includes(value) ? values.filter((id) => id !== value) : [...values, value]);
  };
  const updatedAt = snapshot?.generatedAt
    ? new Intl.DateTimeFormat(i18n.language, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(snapshot.generatedAt))
    : '—';
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
      <Card className="admin-filter-card control-room-toolbar">
        <details
          onToggle={(event) => {
            setScopeOpen(event.currentTarget.open);
          }}
        >
          <summary>
            <span>
              <SlidersHorizontal aria-hidden="true" />
              {t('controlRoom.scopeTitle')}
            </span>
            <small>
              {scopeOpen
                ? t('controlRoom.scopeDescription')
                : t('controlRoom.scopeSummary', {
                    period: t(`controlRoom.period.${period}`),
                    refresh: t(
                      `controlRoom.refreshFrequency.${refreshInterval === false ? 'off' : refreshInterval === 30_000 ? '30s' : refreshInterval === 60_000 ? '1m' : '5m'}`,
                    ),
                    count: filtered.length,
                  })}
            </small>
          </summary>
          <div className="control-room-scope-body">
            <div className="control-room-quick-filters">
              <label className="control-room-filter-block">
                <div className="control-room-filter-heading">
                  <RefreshCw aria-hidden="true" />
                  <span>{t('controlRoom.refreshFrequency')}</span>
                  <small>{t('controlRoom.updatedAt', { time: updatedAt })}</small>
                </div>
                <select
                  value={refreshIntervalKey(refreshInterval)}
                  onChange={(event) => {
                    setRefreshInterval(
                      refreshIntervals[event.target.value as keyof typeof refreshIntervals],
                    );
                  }}
                >
                  {(Object.keys(refreshIntervals) as Array<keyof typeof refreshIntervals>).map(
                    (value) => (
                      <option key={value} value={value}>
                        {t(`controlRoom.refreshFrequency.${value}`)}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label className="control-room-filter-block">
                <div className="control-room-filter-heading">
                  <CalendarRange aria-hidden="true" />
                  <span>{t('controlRoom.period')}</span>
                </div>
                <select
                  value={period}
                  onChange={(event) => {
                    setPeriod(event.target.value as Period);
                    setRangeAnchor(Date.now());
                  }}
                >
                  {(['2h', '8h', 'today', '24h', '7d'] as const).map((value) => (
                    <option key={value} value={value}>
                      {t(`controlRoom.period.${value}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="control-room-filter-block">
                <div className="control-room-filter-heading">
                  <Activity aria-hidden="true" />
                  <span>{t('controlRoom.operationalState')}</span>
                </div>
                <select
                  value={pressure}
                  onChange={(event) => {
                    setPressure(event.target.value as PressureFilter);
                  }}
                >
                  {(['all', 'danger', 'warning', 'healthy'] as const).map((value) => (
                    <option key={value} value={value}>
                      {t(`controlRoom.pressure.${value}`)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="control-room-selections">
              <fieldset className="control-room-queue-picker">
                <legend>
                  <span>{t('controlRoom.selectQueues')}</span>
                  <small>
                    {t('controlRoom.visibleQueues', {
                      count: filtered.length,
                      total: items.length,
                    })}
                  </small>
                </legend>
                <div className="queue-choice-list">
                  <Button
                    variant="unstyled"
                    className={!selectedQueueIds.length ? 'active' : ''}
                    type="button"
                    aria-pressed={!selectedQueueIds.length}
                    onClick={() => {
                      setSelectedQueueIds([]);
                    }}
                  >
                    <Check />
                    {t('controlRoom.allQueues')}
                  </Button>
                  {items.map((queue) => (
                    <Button
                      variant="unstyled"
                      key={queue.queueId}
                      className={selectedQueueIds.includes(queue.queueId) ? 'active' : ''}
                      type="button"
                      aria-pressed={selectedQueueIds.includes(queue.queueId)}
                      onClick={() => {
                        toggle(selectedQueueIds, queue.queueId, setSelectedQueueIds);
                      }}
                    >
                      <Check />
                      <span>{queue.queueName}</span>
                      <small>
                        {queue.waiting} {t('common.waiting')}
                      </small>
                    </Button>
                  ))}
                </div>
              </fieldset>
              {uniqueOperators.length ? (
                <fieldset className="control-room-queue-picker">
                  <legend>
                    <span>{t('controlRoom.filterOperators')}</span>
                  </legend>
                  <div className="queue-choice-list">
                    <Button
                      variant="unstyled"
                      className={!selectedUserIds.length ? 'active' : ''}
                      type="button"
                      aria-pressed={!selectedUserIds.length}
                      onClick={() => {
                        setSelectedUserIds([]);
                      }}
                    >
                      <Check />
                      {t('controlRoom.allOperators')}
                    </Button>
                    {uniqueOperators.map((operator) => (
                      <Button
                        variant="unstyled"
                        key={operator.userId}
                        className={selectedUserIds.includes(operator.userId) ? 'active' : ''}
                        type="button"
                        aria-pressed={selectedUserIds.includes(operator.userId)}
                        onClick={() => {
                          toggle(selectedUserIds, operator.userId, setSelectedUserIds);
                        }}
                      >
                        <Check />
                        <span>{operator.displayName}</span>
                      </Button>
                    ))}
                  </div>
                </fieldset>
              ) : null}
            </div>
          </div>
        </details>
      </Card>
      <div className="metric-grid control-room-metrics">
        <MetricCard
          label={t('common.activeQueues')}
          value={snapshot?.totals.activeQueues ?? 0}
          icon={<ListChecks />}
        />
        <MetricCard
          label={t('common.waiting')}
          value={snapshot?.totals.waiting ?? 0}
          icon={<UsersRound />}
        />
        <MetricCard
          label={t('common.inProgress')}
          value={snapshot?.totals.inProgress ?? 0}
          icon={<Activity />}
        />
        <MetricCard
          label={t('common.activeCounters')}
          value={snapshot?.totals.openDesks ?? 0}
          icon={<MonitorUp />}
        />
        <MetricCard
          label={t('controlRoom.operatorSessions')}
          value={snapshot?.totals.activeOperators ?? 0}
          icon={<UsersRound />}
        />
        <MetricCard
          label={t('controlRoom.longestWait')}
          value={
            snapshot?.totals.longestWaitMinutes == null
              ? '—'
              : `${String(snapshot.totals.longestWaitMinutes)} ${t('common.min')}`
          }
          icon={<Clock3 />}
        />
      </div>
      {snapshot?.alerts.length ? (
        <Card className="control-room-alerts">
          <div className="control-room-alerts-head">
            <div className="control-room-alerts-title">
              <span className="control-room-alerts-icon">
                <AlertTriangle aria-hidden="true" />
              </span>
              <div>
                <span className="eyebrow">{t('controlRoom.operationalAlerts')}</span>
                <h2>{t('controlRoom.alertCount', { count: snapshot.alerts.length })}</h2>
                <p>{t('controlRoom.alertsDescription')}</p>
              </div>
            </div>
            <div className="control-room-alert-summary" aria-label={t('controlRoom.alertSummary')}>
              {alertCounts.critical ? (
                <StatusBadge tone="danger">
                  {alertCounts.critical} {t('controlRoom.alert.critical')}
                </StatusBadge>
              ) : null}
              {alertCounts.warning ? (
                <StatusBadge tone="warning">
                  {alertCounts.warning} {t('controlRoom.alert.warning')}
                </StatusBadge>
              ) : null}
              {alertCounts.info ? (
                <StatusBadge tone="neutral">
                  {alertCounts.info} {t('controlRoom.alert.info')}
                </StatusBadge>
              ) : null}
            </div>
          </div>
          <ul className="control-room-alert-list">
            {snapshot.alerts.map((alert, index) => {
              const queueName = alert.queueId ? queueNames.get(alert.queueId) : undefined;
              const Icon = alert.severity === 'info' ? Info : AlertTriangle;
              const codeMessageKey = `controlRoom.alertMessage.${alert.code}`;
              const message = i18n.exists(alert.messageKey)
                ? t(alert.messageKey, alert.translationParams)
                : i18n.exists(codeMessageKey)
                  ? t(codeMessageKey, alert.translationParams)
                  : t('controlRoom.alertMessage.generic');
              return (
                <li
                  key={`${alert.code}-${String(alert.queueId ?? index)}`}
                  className={`control-room-alert-item control-room-alert-${alert.severity}`}
                >
                  <span className="control-room-alert-item-icon">
                    <Icon aria-hidden="true" />
                  </span>
                  <div className="control-room-alert-content">
                    {queueName ? (
                      <span className="control-room-alert-queue">{queueName}</span>
                    ) : null}
                    <strong>{message}</strong>
                    <small>{t(`controlRoom.alert.${alert.severity}`)}</small>
                  </div>
                  {alert.queueId ? (
                    <Button
                      size="small"
                      onClick={() => {
                        if (alert.queueId) {
                          setSelectedQueueIds([alert.queueId]);
                          setSelectedUserIds([]);
                          setPressure('all');
                          document
                            .querySelector('.supervision-grid')
                            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }}
                    >
                      {t('controlRoom.showQueue')}
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}
      <ControlRoomInsights
        queues={filtered.map(({ queue }) => queue)}
        buckets={series.data?.data.series ?? []}
        isError={series.isError}
        onRetry={() => void series.refetch()}
      />
      {!live.isLoading && !filtered.length ? (
        <EmptyState
          title={
            items.length
              ? t('controlRoom.noMatchingQueue')
              : t('supervision.controlRoom.aucuneFileASuperviser')
          }
        />
      ) : (
        <div className="queue-card-grid supervision-grid">
          {filtered.map(({ queue, tone, operators }) => (
            <Card key={queue.queueId} className={`supervision-queue-card supervision-${tone}`}>
              <div className="card-head">
                <div>
                  <span className="eyebrow">#{queue.queueId}</span>
                  <h2>{queue.queueName}</h2>
                </div>
                <div className="supervision-card-actions">
                  <StatusBadge tone={tone}>
                    {queue.estimatedWaitMinutes ?? '—'} {t('common.min')}
                  </StatusBadge>
                  {canResetQueue ? (
                    <Button
                      variant="unstyled"
                      className="icon-button queue-reset-button"
                      type="button"
                      title={t('supervision.controlRoom.resetQueue')}
                      onClick={() => {
                        setResetTarget({ queueId: queue.queueId, queueName: queue.queueName });
                      }}
                    >
                      <RotateCcw />
                    </Button>
                  ) : null}
                </div>
              </div>
              <div className="queue-live-stats">
                <div>
                  <strong>{queue.waiting}</strong>
                  <span>{t('common.waiting')}</span>
                </div>
                <div>
                  <strong>{queue.inProgress}</strong>
                  <span>{t('common.inProgress')}</span>
                </div>
                <div>
                  <strong>{queue.openDesks}</strong>
                  <span>{t('common.activeCounters')}</span>
                </div>
              </div>
              <div className="operator-section">
                <h3>{t('controlRoom.operatorSessions')}</h3>
                {operators.length ? (
                  <ul className="operator-chips">
                    {operators.map((operator) => (
                      <li key={operator.sessionId}>
                        <MonitorUp />
                        <span>
                          {operator.counterName ||
                            `${t('common.guichet')} ${String(operator.threadNumber ?? t('supervision.controlRoom.flottant'))}`}
                        </span>
                        <strong>{operator.displayName}</strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">{t('controlRoom.noActiveSession')}</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={Boolean(resetTarget)}
        onOpenChange={(open) => {
          if (!open && !resetQueue.isPending) setResetTarget(undefined);
        }}
        title={t('supervision.controlRoom.confirmReset')}
        description={t('supervision.controlRoom.resetDescription', {
          queue: resetTarget?.queueName ?? '',
        })}
        confirmLabel={
          resetQueue.isPending
            ? t('supervision.controlRoom.resetting')
            : t('supervision.controlRoom.confirmResetAction')
        }
        destructive
        onConfirm={() => {
          if (resetTarget && !resetQueue.isPending) resetQueue.run(resetTarget.queueId);
        }}
      />
    </div>
  );
}
