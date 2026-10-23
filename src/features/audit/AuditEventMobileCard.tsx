import { Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AuditEventResponseDto } from '@/api/generated/models';
import { Button } from '@/design-system/components/Button';
import { DataTableMobileCard } from '@/design-system/components/DataTableMobileCard';
import { StatusBadge } from '@/design-system/components/StatusBadge';

export function AuditEventMobileCard({
  event,
  occurredAt,
  onView,
}: {
  event: AuditEventResponseDto;
  occurredAt: string;
  onView: () => void;
}) {
  const { t } = useTranslation();
  return (
    <DataTableMobileCard
      title={event.action}
      subtitle={occurredAt}
      badge={
        <StatusBadge tone={event.outcome === 'success' ? 'success' : 'danger'}>
          {t(`audit.outcomes.${event.outcome}`)}
        </StatusBadge>
      }
      fields={[
        { label: t('audit.fields.actor'), value: event.actorDisplayName ?? t('audit.systemActor') },
        {
          label: t('audit.fields.target'),
          value: event.targetDisplayName ?? `${event.targetType} · ${event.targetId ?? '—'}`,
        },
        { label: t('audit.fields.site'), value: event.siteScopeDisplayName ?? '—' },
      ]}
      actions={
        <Button type="button" onClick={onView}>
          <Eye aria-hidden="true" />
          {t('audit.actions.view')}
        </Button>
      }
    />
  );
}
