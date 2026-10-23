import { useTranslation } from 'react-i18next';
import type { AuditEventDetailResponseDto } from '@/api/generated/models';
import { formatDateTime } from '@/core/i18n/date-format';
import { StatusBadge } from '@/design-system/components/StatusBadge';

function value(value: string | number | null | undefined): string {
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

function activity(valueToFormat: boolean | null | undefined, t: (key: string) => string) {
  if (valueToFormat === null || valueToFormat === undefined) return '—';
  return t(valueToFormat ? 'audit.activity.active' : 'audit.activity.inactive');
}

export function AuditEventDetail({ event }: { event: AuditEventDetailResponseDto }) {
  const { t, i18n } = useTranslation();
  return (
    <div className="audit-detail-sections">
      <section aria-labelledby="audit-detail-summary">
        <h3 id="audit-detail-summary">{t('audit.detail.summary')}</h3>
        <dl className="detail-list">
          <div><dt>{t('audit.fields.date')}</dt><dd>{formatDateTime(event.occurredAt, i18n.language) ?? '—'}</dd></div>
          <div><dt>{t('audit.fields.action')}</dt><dd>{event.actionDisplayName || event.action}</dd></div>
          <div><dt>{t('audit.fields.outcome')}</dt><dd><StatusBadge tone={event.outcome === 'success' ? 'success' : 'danger'}>{t(`audit.outcomes.${event.outcome}`)}</StatusBadge></dd></div>
          <div><dt>{t('audit.fields.eventId')}</dt><dd><code>{event.eventId}</code></dd></div>
          <div><dt>{t('audit.fields.correlationId')}</dt><dd><code>{value(event.correlationId)}</code></dd></div>
        </dl>
      </section>
      <section aria-labelledby="audit-detail-actor">
        <h3 id="audit-detail-actor">{t('audit.detail.actor')}</h3>
        <dl className="detail-list">
          <div><dt>{t('audit.fields.name')}</dt><dd>{value(event.actorFullName ?? event.actorDisplayName)}</dd></div>
          <div><dt>{t('audit.fields.username')}</dt><dd>{value(event.actorUsername)}</dd></div>
          <div><dt>{t('audit.fields.userType')}</dt><dd>{event.actorUserType ? t(`audit.userTypes.${event.actorUserType}`) : '—'}</dd></div>
          <div><dt>{t('audit.fields.identifier')}</dt><dd>{value(event.actorUserId)}</dd></div>
          <div><dt>{t('audit.fields.activity')}</dt><dd>{activity(event.actorIsActive, t)}</dd></div>
        </dl>
      </section>
      <section aria-labelledby="audit-detail-target">
        <h3 id="audit-detail-target">{t('audit.detail.target')}</h3>
        <dl className="detail-list">
          <div><dt>{t('audit.fields.type')}</dt><dd>{event.targetType}</dd></div>
          <div><dt>{t('audit.fields.name')}</dt><dd>{value(event.targetDisplayName)}</dd></div>
          <div><dt>{t('audit.fields.identifier')}</dt><dd>{value(event.targetId)}</dd></div>
          <div><dt>{t('audit.fields.activity')}</dt><dd>{activity(event.targetIsActive, t)}</dd></div>
          <div><dt>{t('audit.fields.secondaryTarget')}</dt><dd>{value(event.secondaryTargetDisplayName ?? event.secondaryTargetId)}</dd></div>
        </dl>
      </section>
      <section aria-labelledby="audit-detail-context">
        <h3 id="audit-detail-context">{t('audit.detail.context')}</h3>
        <dl className="detail-list">
          <div><dt>{t('audit.fields.site')}</dt><dd>{value(event.siteScopeDisplayName)}</dd></div>
          <div><dt>{t('audit.fields.location')}</dt><dd>{value(event.siteScopeLocation)}</dd></div>
          <div><dt>{t('audit.fields.timezone')}</dt><dd>{value(event.siteScopeTimezone)}</dd></div>
          <div><dt>{t('audit.fields.request')}</dt><dd><code>{event.requestMethod} {event.requestPath}</code></dd></div>
          <div><dt>{t('audit.fields.failureType')}</dt><dd>{value(event.failureType)}</dd></div>
        </dl>
      </section>
    </div>
  );
}
