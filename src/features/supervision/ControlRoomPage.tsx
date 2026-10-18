import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, Check, Clock3, ListChecks, MonitorUp, RefreshCw, RotateCcw, UsersRound } from 'lucide-react';
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

type PressureFilter = 'all' | 'danger' | 'warning' | 'healthy';
type Period = '2h' | '8h' | 'today' | '24h' | '7d';

function periodRange(period: Period, now: number) {
  const to = new Date(now);
  const from = new Date(to);
  if (period === 'today') from.setHours(0, 0, 0, 0);
  else from.setTime(to.getTime() - ({ '2h': 2, '8h': 8, '24h': 24, '7d': 24 * 7 }[period] * 3_600_000));
  return { from: from.toISOString(), to: to.toISOString(), bucket: period === '7d' ? 'day' as const : 'hour' as const };
}

export function ControlRoomPage() {
  const { t, i18n } = useTranslation();
  const siteId = useScopeStore((state) => state.activeSiteId);
  const canResetQueue = hasPermission(useSessionStore((state) => state.user), 'queue_reset');
  const [selectedQueueIds, setSelectedQueueIds] = useState<number[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [pressure, setPressure] = useState<PressureFilter>('all');
  const [period, setPeriod] = useState<Period>('8h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [rangeAnchor, setRangeAnchor] = useState(() => Date.now());
  const [resetTarget, setResetTarget] = useState<{ queueId: number; queueName: string }>();
  const range = useMemo(() => periodRange(period, rangeAnchor), [period, rangeAnchor]);
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = window.setInterval(() => { setRangeAnchor(Date.now()); }, 15_000);
    return () => { window.clearInterval(interval); };
  }, [autoRefresh]);
  const live = useMonitoringLive(siteId, autoRefresh);
  const snapshot = live.data?.data;
  const items = snapshot?.queues ?? [];
  const series = useMonitoringSeries({ siteId, queueIds: selectedQueueIds, userIds: selectedUserIds, ...range, timezone: snapshot?.timezone });
  const resetQueue = useResetQueue(() => {
    if (resetTarget) notify({ tone: 'success', title: t('notifications.queue.reset'), message: t('notifications.queue.resetMessage', { queue: resetTarget.queueName }) });
    setResetTarget(undefined);
  });
  if (live.isError) return <ErrorState onRetry={() => void live.refetch()} />;
  const operational = items.map((queue) => ({ queue, tone: slaTone(queue.waiting, queue.estimatedWaitMinutes ?? 0), operators: snapshot?.operators.filter((operator) => operator.queueIds.includes(queue.queueId)) ?? [] }));
  const dangerCount = operational.filter((item) => item.tone === 'danger').length;
  const filtered = operational.filter(({ queue, tone, operators }) => (!selectedQueueIds.length || selectedQueueIds.includes(queue.queueId)) && (!selectedUserIds.length || operators.some((operator) => selectedUserIds.includes(operator.userId))) && (pressure === 'all' || (pressure === 'healthy' ? tone === 'success' : tone === pressure)));
  const toggle = (values: number[], value: number, setter: (next: number[]) => void) => { setter(values.includes(value) ? values.filter((id) => id !== value) : [...values, value]); };
  const refresh = () => { setRangeAnchor(Date.now()); void live.refetch(); };
  const updatedAt = snapshot?.generatedAt ? new Intl.DateTimeFormat(i18n.language, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(snapshot.generatedAt)) : '—';
  return <div className="page-stack control-room-page">
    <PageHeader eyebrow={t('common.pilotage')} title={t('supervision.controlRoom.supervisionTempsReel')} description={t('controlRoom.liveDescription')} actions={<StatusBadge tone={dangerCount ? 'danger' : 'success'}><Activity />{dangerCount ? t('controlRoom.attentionRequired', { count: dangerCount }) : t('controlRoom.allOperational')}</StatusBadge>} />
    <Card className="control-room-command-bar"><div className="control-room-period"><span>{t('controlRoom.period')}</span><div className="segmented-control">{(['2h', '8h', 'today', '24h', '7d'] as const).map((value) => <button key={value} type="button" className={period === value ? 'active' : ''} onClick={() => { setPeriod(value); setRangeAnchor(Date.now()); }}>{t(`controlRoom.period.${value}`)}</button>)}</div></div><div className="control-room-refresh"><label><input type="checkbox" checked={autoRefresh} onChange={(event) => { setAutoRefresh(event.target.checked); }} />{t('controlRoom.autoRefresh')}</label><span>{t('controlRoom.updatedAt', { time: updatedAt })}</span><button type="button" className="secondary-button" onClick={refresh} disabled={live.isFetching}><RefreshCw className={live.isFetching ? 'is-spinning' : ''} />{t('controlRoom.refresh')}</button></div></Card>
    <div className="metric-grid control-room-metrics">
      <MetricCard label={t('common.activeQueues')} value={snapshot?.totals.activeQueues ?? 0} icon={<ListChecks />} />
      <MetricCard label={t('common.waiting')} value={snapshot?.totals.waiting ?? 0} icon={<UsersRound />} />
      <MetricCard label={t('common.inProgress')} value={snapshot?.totals.inProgress ?? 0} icon={<Activity />} />
      <MetricCard label={t('common.activeCounters')} value={snapshot?.totals.openDesks ?? 0} icon={<MonitorUp />} />
      <MetricCard label={t('controlRoom.operatorSessions')} value={snapshot?.totals.activeOperators ?? 0} icon={<UsersRound />} />
      <MetricCard label={t('controlRoom.longestWait')} value={snapshot?.totals.longestWaitMinutes == null ? '—' : `${String(snapshot.totals.longestWaitMinutes)} ${t('common.min')}`} icon={<Clock3 />} />
    </div>
    {snapshot?.alerts.length ? <Card className="control-room-alerts"><div className="card-head"><div><span className="eyebrow">{t('controlRoom.operationalAlerts')}</span><h2>{t('controlRoom.attentionRequired', { count: snapshot.alerts.length })}</h2></div></div><ul className="manager-list">{snapshot.alerts.map((alert, index) => <li key={`${alert.code}-${String(alert.queueId ?? index)}`}><StatusBadge tone={alert.severity === 'critical' ? 'danger' : alert.severity === 'warning' ? 'warning' : 'neutral'}>{alert.code}</StatusBadge><span>{t(alert.messageKey, alert.translationParams)}</span>{alert.queueId ? <button className="secondary-button" type="button" onClick={() => { if (alert.queueId) setSelectedQueueIds([alert.queueId]); }}>{t('controlRoom.showQueue')}</button> : null}</li>)}</ul></Card> : null}
    <Card className="control-room-toolbar"><fieldset className="control-room-queue-picker"><legend>{t('controlRoom.selectQueues')}</legend><div className="queue-choice-list"><button className={!selectedQueueIds.length ? 'active' : ''} type="button" aria-pressed={!selectedQueueIds.length} onClick={() => { setSelectedQueueIds([]); }}><Check />{t('controlRoom.allQueues')}</button>{items.map((queue) => <button key={queue.queueId} className={selectedQueueIds.includes(queue.queueId) ? 'active' : ''} type="button" aria-pressed={selectedQueueIds.includes(queue.queueId)} onClick={() => { toggle(selectedQueueIds, queue.queueId, setSelectedQueueIds); }}><Check /><span>{queue.queueName}</span><small>{queue.waiting} {t('common.waiting')}</small></button>)}</div></fieldset>
      {snapshot?.operators.length ? <fieldset className="control-room-queue-picker"><legend>{t('controlRoom.filterOperators')}</legend><div className="queue-choice-list"><button className={!selectedUserIds.length ? 'active' : ''} type="button" onClick={() => { setSelectedUserIds([]); }}><Check />{t('controlRoom.allOperators')}</button>{snapshot.operators.map((operator) => <button key={operator.userId} className={selectedUserIds.includes(operator.userId) ? 'active' : ''} type="button" onClick={() => { toggle(selectedUserIds, operator.userId, setSelectedUserIds); }}><Check /><span>{operator.displayName}</span></button>)}</div></fieldset> : null}
      <div className="control-room-filter-row"><div className="segmented-control" role="group" aria-label={t('controlRoom.filterPressure')}>{(['all', 'danger', 'warning', 'healthy'] as const).map((value) => <button key={value} className={pressure === value ? 'active' : ''} type="button" onClick={() => { setPressure(value); }}>{t(`controlRoom.pressure.${value}`)}</button>)}</div><span className="muted">{t('controlRoom.visibleQueues', { count: filtered.length, total: items.length })}</span></div></Card>
    <ControlRoomInsights queues={filtered.map(({ queue }) => queue)} buckets={series.data?.data.series ?? []} isError={series.isError} onRetry={() => void series.refetch()} onSelectQueue={(queueId) => { setSelectedQueueIds([queueId]); }} />
    {!live.isLoading && !filtered.length ? <EmptyState title={items.length ? t('controlRoom.noMatchingQueue') : t('supervision.controlRoom.aucuneFileASuperviser')} /> : <div className="queue-card-grid supervision-grid">{filtered.map(({ queue, tone, operators }) => <Card key={queue.queueId} className={`supervision-queue-card supervision-${tone}`}><div className="card-head"><div><span className="eyebrow">#{queue.queueId}</span><h2>{queue.queueName}</h2></div><div className="supervision-card-actions"><StatusBadge tone={tone}>{queue.estimatedWaitMinutes ?? '—'} {t('common.min')}</StatusBadge>{canResetQueue ? <button className="icon-button queue-reset-button" type="button" title={t('supervision.controlRoom.resetQueue')} onClick={() => { setResetTarget({ queueId: queue.queueId, queueName: queue.queueName }); }}><RotateCcw /></button> : null}</div></div><div className="queue-live-stats"><div><strong>{queue.waiting}</strong><span>{t('common.waiting')}</span></div><div><strong>{queue.inProgress}</strong><span>{t('common.inProgress')}</span></div><div><strong>{queue.openDesks}</strong><span>{t('common.activeCounters')}</span></div></div><div className="operator-section"><h3>{t('controlRoom.operatorSessions')}</h3>{operators.length ? <ul className="operator-chips">{operators.map((operator) => <li key={operator.sessionId}><MonitorUp /><span>{operator.counterName || `${t('common.guichet')} ${String(operator.threadNumber ?? t('supervision.controlRoom.flottant'))}`}</span><strong>{operator.displayName}</strong></li>)}</ul> : <p className="muted">{t('controlRoom.noActiveSession')}</p>}</div></Card>)}</div>}
    <ConfirmDialog open={Boolean(resetTarget)} onOpenChange={(open) => { if (!open && !resetQueue.isPending) setResetTarget(undefined); }} title={t('supervision.controlRoom.confirmReset')} description={t('supervision.controlRoom.resetDescription', { queue: resetTarget?.queueName ?? '' })} confirmLabel={resetQueue.isPending ? t('supervision.controlRoom.resetting') : t('supervision.controlRoom.confirmResetAction')} destructive onConfirm={() => { if (resetTarget && !resetQueue.isPending) resetQueue.run(resetTarget.queueId); }} />
  </div>;
}
