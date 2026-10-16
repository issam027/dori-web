import { useState } from 'react';
import type { QueueResponseDto, ReportBucketDto, ReportGroupDto, ReportMetricsDto } from '@/api/generated/models';
import { BarChart3, ChartPie, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/design-system/components/Card';
import { formatReportNumber } from './report-number';

type View = 'trend' | 'comparison' | 'distribution';
type Metric = 'registered' | 'served' | 'walkin' | 'appointments' | 'noShow' | 'cancelled' | 'expired' | 'averageWaitMinutes' | 'medianWaitMinutes' | 'p90WaitMinutes' | 'averageServiceMinutes' | 'medianServiceMinutes' | 'p90ServiceMinutes' | 'noShowRate';
type Series = { id: string; label: string; color: string; values: number[] };

const palette = ['#5b8def', '#64c7a5', '#f3ad55', '#ef6b73', '#9678d3', '#44b4c6', '#d66fb4', '#7f9f45', '#e17c45', '#5f72c9', '#2fa08f', '#b36a5e', '#7b8794', '#c28b2c'];

function Chart({ buckets, series, showLegend = true }: { buckets: readonly ReportBucketDto[]; series: readonly Series[]; showLegend?: boolean }) {
  const { i18n } = useTranslation();
  const [hovered, setHovered] = useState<number>();
  const values = series.flatMap((item) => item.values);
  const max = Math.max(...values, 1);
  const width = 700;
  const height = 230;
  const x = (index: number) => 45 + (buckets.length <= 1 ? width / 2 : (index / (buckets.length - 1)) * width);
  const y = (value: number) => 20 + height - (value / max) * height;
  const band = buckets.length <= 1 ? width : width / Math.max(buckets.length - 1, 1);
  return <div className="report-chart-canvas">
    <svg viewBox="0 0 780 315" role="img">
      {[0, 1, 2, 3, 4].map((line) => { const value = max - (max * line) / 4; const py = 20 + (height * line) / 4; return <g key={line}><line x1="45" x2="745" y1={py} y2={py} className="report-grid-line" /><text x="36" y={py + 4} textAnchor="end" className="report-axis-label">{formatReportNumber(value, i18n.language)}</text></g>; })}
      <line x1="45" x2="45" y1="20" y2="250" className="report-axis" /><line x1="45" x2="745" y1="250" y2="250" className="report-axis" />
      {series.map((item) => <g key={item.id}><polyline points={item.values.map((value, index) => `${String(x(index))},${String(y(value))}`).join(' ')} className="report-line" style={{ stroke: item.color }} />{item.values.map((value, index) => <circle key={index} cx={x(index)} cy={y(value)} r="4" className="report-point" style={{ fill: item.color }} />)}</g>)}
      {buckets.map((bucket, index) => <rect key={bucket.periodStart} x={Math.max(45, x(index) - band / 2)} y="20" width={Math.min(band, 745 - Math.max(45, x(index) - band / 2))} height="230" className="report-hover-band" tabIndex={0} onPointerEnter={() => { setHovered(index); }} onPointerMove={() => { setHovered(index); }} onPointerLeave={() => { setHovered(undefined); }} onFocus={() => { setHovered(index); }} onBlur={() => { setHovered(undefined); }} />)}
      {buckets.filter((_, index) => index === 0 || index === buckets.length - 1 || index === Math.floor(buckets.length / 2)).map((bucket) => { const index = buckets.indexOf(bucket); return <text key={bucket.periodStart} x={x(index)} y="276" textAnchor="middle" className="report-axis-label">{bucket.periodStart.slice(0, 10)}</text>; })}
      {hovered !== undefined && buckets[hovered] ? <g className="report-chart-tooltip" transform={`translate(${String(Math.min(x(hovered) + 8, 545))},28)`}><rect width="190" height={36 + series.length * 20} rx="9" /><text x="12" y="20">{buckets[hovered].periodStart.slice(0, 10)}</text>{series.map((item, index) => <text key={item.id} x="12" y={42 + index * 20}>{item.label}: {formatReportNumber(item.values[hovered] ?? 0, i18n.language)}</text>)}</g> : null}
    </svg>
    {showLegend ? <div className="report-legend">{series.map((item) => <span key={item.id}><i style={{ background: item.color }} />{item.label}</span>)}</div> : null}
  </div>;
}

function TrendChart({ buckets }: { buckets: readonly ReportBucketDto[] }) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string[]>(['registered', 'served']);
  const available: Series[] = [
    { id: 'registered', label: t('reports.visual.registrations'), color: palette[0] ?? '#5b8def', values: buckets.map((bucket) => bucket.volume.registered) },
    { id: 'served', label: t('reports.visual.served'), color: palette[1] ?? '#64c7a5', values: buckets.map((bucket) => bucket.volume.served) },
    { id: 'walkin', label: t('reports.analytics.walkins'), color: palette[2] ?? '#f3ad55', values: buckets.map((bucket) => bucket.volume.walkin) },
    { id: 'appointments', label: t('reports.visual.appointments'), color: palette[3] ?? '#ef6b73', values: buckets.map((bucket) => bucket.volume.appointments) },
    { id: 'noShow', label: t('common.noShow'), color: palette[4] ?? '#9678d3', values: buckets.map((bucket) => bucket.volume.noShow) },
    { id: 'cancelled', label: t('common.cancelled'), color: palette[5] ?? '#44b4c6', values: buckets.map((bucket) => bucket.volume.cancelled) },
    { id: 'expired', label: t('common.expired'), color: palette[6] ?? '#d66fb4', values: buckets.map((bucket) => bucket.volume.expired) },
    { id: 'averageWaitMinutes', label: t('reports.averageWaitAbbreviation'), color: palette[7] ?? '#7f9f45', values: buckets.map((bucket) => bucket.timing.averageWaitMinutes ?? 0) },
    { id: 'medianWaitMinutes', label: t('reports.medianWait'), color: palette[8] ?? '#e17c45', values: buckets.map((bucket) => bucket.timing.medianWaitMinutes ?? 0) },
    { id: 'p90WaitMinutes', label: t('reports.p90Wait'), color: palette[9] ?? '#5f72c9', values: buckets.map((bucket) => bucket.timing.p90WaitMinutes ?? 0) },
    { id: 'averageServiceMinutes', label: t('reports.averageServiceAbbreviation'), color: palette[10] ?? '#2fa08f', values: buckets.map((bucket) => bucket.timing.averageServiceMinutes ?? 0) },
    { id: 'medianServiceMinutes', label: t('reports.medianService'), color: palette[11] ?? '#b36a5e', values: buckets.map((bucket) => bucket.timing.medianServiceMinutes ?? 0) },
    { id: 'p90ServiceMinutes', label: t('reports.p90Service'), color: palette[12] ?? '#7b8794', values: buckets.map((bucket) => bucket.timing.p90ServiceMinutes ?? 0) },
    { id: 'noShowRate', label: t('reports.visual.noShowRate'), color: palette[13] ?? '#c28b2c', values: buckets.map((bucket) => (bucket.rates.noShowRate ?? 0) * 100) },
  ];
  const toggle = (id: string) => { setSelected((current) => current.includes(id) ? (current.length > 1 ? current.filter((item) => item !== id) : current) : [...current, id]); };
  return <div className="report-trend"><Chart buckets={buckets} series={available.filter((item) => selected.includes(item.id))} showLegend={false} /><div className="report-series-picker" role="group" aria-label={t('reports.visual.indicatorsToDisplay')}>{available.map((item) => { const active = selected.includes(item.id); return <button key={item.id} type="button" className={active ? 'active' : ''} aria-pressed={active} onClick={() => { toggle(item.id); }}><i style={{ background: item.color }} />{item.label}</button>; })}</div></div>;
}

function groupId(group: ReportGroupDto, index: number) {
  const value = group.dimension.queueId ?? group.dimension.queue_id ?? group.dimension.id ?? group.dimension.value ?? group.dimension.key;
  return typeof value === 'number' || typeof value === 'string' ? String(value) : String(index);
}
function groupLabel(group: ReportGroupDto, index: number, fallback: (number: number) => string) { const label = group.dimension.queueName ?? group.dimension.queue_name ?? group.dimension.label ?? group.dimension.name ?? group.dimension.queueCode ?? group.dimension.queue_code; return typeof label === 'string' ? label : fallback(index + 1); }
function metricValue(bucket: ReportBucketDto, metric: Metric) {
  if (metric === 'registered' || metric === 'served' || metric === 'walkin' || metric === 'appointments' || metric === 'noShow' || metric === 'cancelled' || metric === 'expired') return bucket.volume[metric];
  if (metric === 'noShowRate') return (bucket.rates.noShowRate ?? 0) * 100;
  return bucket.timing[metric] ?? 0;
}

function ComparisonChart({ groups, queues }: { groups: readonly ReportGroupDto[]; queues: readonly QueueResponseDto[] }) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string[] | null>(null);
  const [metric, setMetric] = useState<Metric>('registered');
  const available = groups.map((group, index) => {
    const id = groupId(group, index);
    const queue = queues.find((item) => String(item.queueId) === id) ?? queues[index];
    return { group, id, label: queue ? `${queue.queueCode} · ${queue.queueName}` : groupLabel(group, index, (number) => t('reports.visual.queueFallback', { number })) };
  });
  const effective = selected ?? available.slice(0, 3).map((item) => item.id);
  const visible = available.filter((item) => effective.includes(item.id));
  const periods = [...new Set(visible.flatMap((item) => item.group.buckets.map((bucket) => bucket.periodStart)))].sort();
  const bucketByPeriod = new Map(visible.flatMap((item) => item.group.buckets.map((bucket) => [bucket.periodStart, bucket] as const)));
  const buckets = periods.flatMap((period) => { const bucket = bucketByPeriod.get(period); return bucket ? [bucket] : []; });
  const series = visible.map((item) => { const index = available.findIndex((candidate) => candidate.id === item.id); const valuesByPeriod = new Map(item.group.buckets.map((bucket) => [bucket.periodStart, metricValue(bucket, metric)])); return { id: item.id, label: item.label, color: palette[index % palette.length] ?? '#5b8def', values: periods.map((period) => valuesByPeriod.get(period) ?? 0) }; });
  return <div className="report-comparison"><div className="report-comparison-controls"><label>{t('reports.visual.metric')}<select value={metric} onChange={(event) => { setMetric(event.target.value as Metric); }}><option value="registered">{t('reports.visual.registrations')}</option><option value="served">{t('reports.visual.served')}</option><option value="walkin">{t('reports.analytics.walkins')}</option><option value="appointments">{t('reports.visual.appointments')}</option><option value="noShow">{t('common.noShow')}</option><option value="averageWaitMinutes">{t('reports.averageWaitAbbreviation')}</option><option value="medianWaitMinutes">{t('reports.medianWait')}</option><option value="p90WaitMinutes">{t('reports.p90Wait')}</option><option value="averageServiceMinutes">{t('reports.averageServiceAbbreviation')}</option><option value="medianServiceMinutes">{t('reports.medianService')}</option><option value="p90ServiceMinutes">{t('reports.p90Service')}</option><option value="noShowRate">{t('reports.visual.noShowRate')}</option></select></label><fieldset><legend>{t('reports.visual.queuesToCompare')}</legend>{available.map((item) => <label key={item.id}><input type="checkbox" checked={effective.includes(item.id)} onChange={() => { setSelected((current) => { const base = current ?? effective; return base.includes(item.id) ? base.filter((id) => id !== item.id) : [...base, item.id]; }); }} />{item.label}</label>)}</fieldset></div>{visible.length ? <Chart buckets={buckets} series={series} /> : <p className="report-comparison-empty">{t('reports.visual.selectAtLeastOneQueue')}</p>}</div>;
}

function DonutPanel({ title, description, values, labels, center, centerLabel, suffix = '', highlights = [] }: { title: string; description: string; values: readonly number[]; labels: readonly string[]; center: string; centerLabel: string; suffix?: string; highlights?: readonly { label: string; value: string }[] }) {
  const { i18n } = useTranslation();
  const total = Math.max(values.reduce((sum, value) => sum + value, 0), 1);
  const gradient = values.map((value, index) => { const start = values.slice(0, index).reduce((sum, item) => sum + item, 0) / total * 100; const end = start + (value / total) * 100; return `${palette[index] ?? '#5b8def'} ${String(start)}% ${String(end)}%`; }).join(',');
  return <article className="report-donut-panel"><header><h3>{title}</h3><p>{description}</p></header>{highlights.length ? <dl className="report-donut-highlights">{highlights.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl> : null}<div className="report-donut-layout"><div className="report-donut" style={{ background: `conic-gradient(${gradient})` }}><span><strong>{center}</strong>{centerLabel}</span></div><div className="report-donut-legend">{labels.map((label, index) => <span key={label}><i style={{ background: palette[index] }} />{label}<strong>{formatReportNumber(values[index] ?? 0, i18n.language)}{suffix} <small>{formatReportNumber((values[index] ?? 0) / total * 100, i18n.language)}%</small></strong></span>)}</div></div></article>;
}

function DonutCharts({ metrics }: { metrics: ReportMetricsDto }) {
  const { t, i18n } = useTranslation();
  const outcomes = [metrics.volume.served, metrics.volume.noShow, metrics.volume.cancelled, metrics.volume.expired];
  const completed = outcomes.reduce((sum, value) => sum + value, 0);
  const wait = metrics.timing.averageWaitMinutes ?? 0;
  const service = metrics.timing.averageServiceMinutes ?? 0;
  return <div className="report-donut-grid">
    <DonutPanel title={t('reports.visual.flowDistribution')} description={t('reports.visual.flowDistributionHelp')} values={outcomes} labels={[t('reports.visual.served'), t('common.noShow'), t('common.cancelled'), t('common.expired')]} center={String(completed)} centerLabel={t('reports.visual.completedOutcomes')} highlights={[{ label: t('reports.visual.registrations'), value: String(metrics.volume.registered) }, { label: t('reports.visual.appointments'), value: String(metrics.volume.appointments) }, { label: t('reports.analytics.walkins'), value: String(metrics.volume.walkin) }]} />
    <DonutPanel title={t('reports.visual.timeDistribution')} description={t('reports.visual.timeDistributionHelp')} values={[wait, service]} labels={[t('reports.averageWaitAbbreviation'), t('reports.averageServiceAbbreviation')]} center={formatReportNumber(wait + service, i18n.language)} centerLabel={t('reports.visual.minutesTotal')} suffix={` ${t('common.min')}`} highlights={[{ label: t('reports.p90Wait'), value: `${formatReportNumber(metrics.timing.p90WaitMinutes ?? 0, i18n.language)} ${t('common.min')}` }, { label: t('reports.p90Service'), value: `${formatReportNumber(metrics.timing.p90ServiceMinutes ?? 0, i18n.language)} ${t('common.min')}` }]} />
  </div>;
}

export function ReportVisualizations({ buckets, groups, summary, queues }: { buckets: readonly ReportBucketDto[]; groups: readonly ReportGroupDto[]; summary: ReportMetricsDto; queues: readonly QueueResponseDto[] }) {
  const { t } = useTranslation(); const [view, setView] = useState<View>('trend');
  return <Card className="report-visual-panel"><div className="card-head report-visual-toolbar"><div><span className="eyebrow">{t('reports.visual.exploration')}</span><h2>{t('reports.visual.title')}</h2></div><div className="segmented-control" role="group" aria-label={t('reports.visual.type')}><button className={view === 'trend' ? 'active' : ''} onClick={() => { setView('trend'); }}><TrendingUp />{t('reports.visual.trend')}</button><button className={view === 'comparison' ? 'active' : ''} onClick={() => { setView('comparison'); }}><BarChart3 />{t('reports.visual.comparison')}</button><button className={view === 'distribution' ? 'active' : ''} onClick={() => { setView('distribution'); }}><ChartPie />{t('reports.visual.distribution')}</button></div></div>{view === 'trend' ? <TrendChart buckets={buckets} /> : view === 'comparison' ? <ComparisonChart groups={groups} queues={queues} /> : <DonutCharts metrics={summary} />}</Card>;
}
