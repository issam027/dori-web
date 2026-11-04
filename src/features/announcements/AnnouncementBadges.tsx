import { useTranslation } from 'react-i18next';
import type { AnnouncementResponseDto } from '@/api/generated/models';
import { StatusBadge } from '@/design-system/components/StatusBadge';

export function AnnouncementStatus({ item }: { item: AnnouncementResponseDto }) {
  const { t } = useTranslation();
  return (
    <StatusBadge
      tone={
        item.status === 'active' ? 'success' : item.status === 'scheduled' ? 'warning' : 'neutral'
      }
    >
      {t(`announcements.status.${item.status}`)}
    </StatusBadge>
  );
}
export function AnnouncementSeverity({ item }: { item: AnnouncementResponseDto }) {
  const { t } = useTranslation();
  return (
    <StatusBadge
      tone={
        item.severity === 'critical'
          ? 'danger'
          : item.severity === 'warning'
            ? 'warning'
            : 'neutral'
      }
    >
      {t(`announcements.severity.${item.severity}`)}
    </StatusBadge>
  );
}
