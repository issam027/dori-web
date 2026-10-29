import { useTranslation } from 'react-i18next';
import { Eye } from 'lucide-react';
import type { RegistrationResponseDto } from '@/api/generated/models';
import { Button } from '@/design-system/components/Button';
import { StatusBadge } from '@/design-system/components/StatusBadge';
import { serviceTierVisualClass } from '@/design-system/service-tier';
import { PersonNotesButton } from '@/features/notes/PersonNotesButton';
import { DataTableMobileCard } from '@/design-system/components/DataTableMobileCard';
import { entryTypeKey, registrationStatusKey } from '@/shared/presentation/domain-labels';

interface QueueRegistrationMobileCardProps {
  registration: RegistrationResponseDto;
  position: number;
  queueName: string;
  onView: () => void;
  onNotes: () => void;
}

export function QueueRegistrationMobileCard({
  registration,
  position,
  queueName,
  onView,
  onNotes,
}: QueueRegistrationMobileCardProps) {
  const { t } = useTranslation();
  const personName =
    [registration.firstName, registration.lastName].filter(Boolean).join(' ') || '—';

  return (
    <DataTableMobileCard
      className="queue-registration-mobile-card"
      title={personName}
      subtitle={registration.ticketNumber}
      badge={
        <StatusBadge tone="neutral">{t(registrationStatusKey(registration.status))}</StatusBadge>
      }
      fields={[
        { label: t('queues.myQueues.siteAndQueue'), value: queueName, wide: true },
        { label: t('common.position'), value: position },
        { label: t('common.type'), value: t(entryTypeKey(registration.entryType)) },
        {
          label: t('common.tier'),
          value: (
            <span
              className={`service-tier-badge ${serviceTierVisualClass(registration.tierId, registration.tierName)}`}
            >
              {registration.tierName ??
                t('queue-operations.quickRegistration.serviceFallback', {
                  id: registration.tierId,
                })}
            </span>
          ),
        },
      ]}
      actions={
        <>
          <Button size="small" type="button" onClick={onView}>
            <Eye aria-hidden="true" /> {t('queues.myQueues.consulter')}
          </Button>
          <PersonNotesButton
            className="button button-small"
            noteCount={registration.activeNoteCount}
            onClick={onNotes}
          />
        </>
      }
    />
  );
}
