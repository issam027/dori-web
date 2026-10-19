import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MonitoringLiveQueueDto, MonitoringSeriesBucketDto } from '@/api/generated/models';
import { Card } from '@/design-system/components/Card';
import { ErrorState } from '@/design-system/components/FeedbackState';
import { slaTone } from './sla';

type FlowMetric = 'registered' | 'served' | 'noShow' | 'cancelled';
const colors: Record<FlowMetric, string> = { registered: 'var(--color-primary)', served: 'var(--color-success)', noShow: 'var(--color-warning)', cancelled: 'var(--color-danger)' };

function FlowChart({ buckets }: { buckets: readonly MonitoringSeriesBucketDto[] }) {
  const { t, i18n } = useTranslation();
  const [visible, setVisible] = useState<FlowMetric[]>(['registered', 'served']);
  const metrics: FlowMetric[] = ['registered', 'served', 'noShow', 'cancelled'];
  const values = visible.flatMap((metric) => buckets.map((bucket) => bucket[metric]));
  const max = Math.max(...values, 1);
  const x = (index: number) => 42 + (buckets.length < 2 ? 330 : index / (buckets.length - 1) * 650);
  const y = (value: number) => 20 + 190 - value / max * 190;
  const formatTime = (value: string) => new Intl.DateTimeFormat(i18n.language, { weekday: buckets.length > 24 ? 'short' : undefined, hour: '2-digit', minute: buckets.length > 24 ? undefined : '2-digit' }).format(new Date(value));
  return <>
    <div className="control-room-chart"><svg viewBox="0 0 735 250" role="img" aria-label={t('controlRoom.flowChart')}>
      {[0, 1, 2, 3].map((line) => <line key={line} x1="42" x2="692" y1={20 + line * 63.33} y2={20 + line * 63.33} className="report-grid-line" />)}
      {visible.map((metric) => <polyline key={metric} points={buckets.map((bucket, index) => `${String(x(index))},${String(y(bucket[metric]))}`).join(' ')} className="report-line" style={{ stroke: colors[metric] }} />)}
      {buckets.filter((_, index) => index === 0 || index === buckets.length - 1 || index === Math.floor(buckets.length / 2)).map((bucket) => { const index = buckets.indexOf(bucket); return <text key={bucket.periodStart} x={x(index)} y="238" textAnchor="middle" className="report-axis-label">{formatTime(bucket.periodStart)}</text>; })}
    </svg></div>
    <div className="report-series-picker">{metrics.map((metric) => <button key={metric} type="button" className={visible.includes(metric) ? 'active' : ''} aria-pressed={visible.includes(metric)} onClick={() => { setVisible((current) => current.includes(metric) ? (current.length > 1 ? current.filter((item) => item !== metric) : current) : [...current, metric]); }}><i style={{ background: colors[metric] }} />{t(`controlRoom.flow.${metric}`)}</button>)}</div>
  </>;
}

export function ControlRoomInsights({ queues, buckets, isError, onRetry }: { queues: readonly MonitoringLiveQueueDto[]; buckets: readonly MonitoringSeriesBucketDto[]; isError: boolean; onRetry: () => void }) {
  const { t } = useTranslation();
  const maxLoad = Math.max(...queues.flatMap((queue) => [queue.waiting, queue.openDesks, queue.activeOperators]), 1);
  return <div className="control-room-insight-grid">
    <Card className="control-room-flow-card"><div className="card-head"><div><span className="eyebrow">{t('controlRoom.recentActivity')}</span><h2>{t('controlRoom.flowTitle')}</h2></div></div>{isError ? <ErrorState onRetry={onRetry} /> : buckets.length ? <FlowChart buckets={buckets} /> : <p className="muted">{t('controlRoom.noRecentActivity')}</p>}</Card>
    <Card className="control-room-pressure-card"><div className="card-head"><div><span className="eyebrow">{t('controlRoom.liveCapacity')}</span><h2>{t('controlRoom.pressureTitle')}</h2></div></div><div className="pressure-legend"><span><i className="waiting" />{t('common.waiting')}</span><span><i className="desks" />{t('common.activeCounters')}</span><span><i className="operators" />{t('controlRoom.operatorSessions')}</span></div><div className="pressure-bars">{queues.map((queue) => <div className="pressure-row" key={queue.queueId}><span className="pressure-label"><strong>{queue.queueName}</strong><small>{t('controlRoom.maximumWaitValue', { value: queue.longestWaitMinutes ?? 0 })}</small></span><span className="pressure-track"><i className={`waiting ${slaTone(queue.waiting, queue.estimatedWaitMinutes ?? 0)}`} style={{ width: `${String(queue.waiting / maxLoad * 100)}%` }} /><i className="desks" style={{ width: `${String(queue.openDesks / maxLoad * 100)}%` }} /><i className="operators" style={{ width: `${String(queue.activeOperators / maxLoad * 100)}%` }} /></span></div>)}</div></Card>
  </div>;
}
