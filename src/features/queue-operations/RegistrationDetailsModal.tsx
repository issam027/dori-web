import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, Clock3, Hash, Mail, MapPin, Phone, Ticket, UserRound } from 'lucide-react';
import { Modal } from '@/design-system/components/Modal';
import { StatusBadge } from '@/design-system/components/StatusBadge';
import { usePerson } from '@/features/persons/hooks/usePersons';
import { useRegistration } from './hooks/useQueueOperations';

export function RegistrationDetailsModal({
  registrationId,
  queueName,
  open,
  onOpenChange,
}: {
  registrationId: number | null;
  queueName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const registration = useRegistration(registrationId, open);
  const item = registration.data?.data;
  const person = usePerson(item?.personId, open && Boolean(item));
  const customer = person.data?.data;
  const formatDate = (value?: string, dateOnly = false) =>
    value
      ? new Intl.DateTimeFormat(
          'fr-FR',
          dateOnly ? { dateStyle: 'long' } : { dateStyle: 'medium', timeStyle: 'short' },
        ).format(new Date(value))
      : '—';
  const tone =
    item?.status === 'served'
      ? 'success'
      : item?.status === 'waiting' || item?.status === 'in_progress'
        ? 'warning'
        : 'neutral';

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t('queues.registrationDetails.detailDeLInscription')}
      description={t('queues.registrationDetails.readOnlyDescription')}
    >
      {registration.isLoading ? (
        <p className="registration-detail-loading" role="status">
          {t('queues.registrationDetails.chargementDeLInscription…')}
        </p>
      ) : item ? (
        <div className="registration-detail">
          <header className="registration-detail-hero">
            <span className="registration-detail-icon" aria-hidden="true">
              <Ticket />
            </span>
            <div>
              <small>{t('common.ticket')}</small>
              <strong>{item.ticketNumber}</strong>
              <span>
                {queueName ??
                  t('queues.registrationDetails.queueFallback', { id: String(item.queueId) })}
              </span>
            </div>
            <StatusBadge tone={tone}>{item.status}</StatusBadge>
          </header>
          <section className="registration-detail-section">
            <h3>
              <UserRound aria-hidden="true" /> {t('queues.registrationDetails.client')}
            </h3>
            <div className="registration-detail-grid">
              <Detail
                icon={<UserRound />}
                label={t('common.fullName')}
                value={
                  customer
                    ? ((customer.firstName || '') + ' ' + (customer.lastName || '')).trim()
                    : '…'
                }
              />
              <Detail
                icon={<Phone />}
                label={t('common.phone')}
                value={customer?.phoneNumber ?? '—'}
              />
              <Detail icon={<Mail />} label={t('common.email')} value={customer?.email ?? '—'} />
              <Detail
                icon={<MapPin />}
                label={t('common.language')}
                value={customer?.preferredLanguage.toUpperCase() ?? '—'}
              />
            </div>
          </section>
          <section className="registration-detail-section">
            <h3>
              <CalendarDays aria-hidden="true" /> {t('supervision.notifications.inscription')}
            </h3>
            <div className="registration-detail-grid">
              <Detail
                icon={<Hash />}
                label={t('common.identifier')}
                value={String(item.registrationId)}
              />
              <Detail
                icon={<CalendarDays />}
                label={t('common.businessDate')}
                value={formatDate(item.businessDate, true)}
              />
              <Detail
                icon={<Clock3 />}
                label={t('common.createdAt')}
                value={formatDate(item.createdAt)}
              />
              <Detail
                icon={<Clock3 />}
                label={t('common.updatedAt')}
                value={formatDate(item.updatedAt)}
              />
              <Detail icon={<Ticket />} label={t('common.entryType')} value={item.entryType} />
              <Detail icon={<Hash />} label={t('common.tier')} value={'#' + String(item.tierId)} />
              {item.scheduledTime ? (
                <Detail
                  icon={<CalendarDays />}
                  label={t('appointments.title')}
                  value={formatDate(item.scheduledTime)}
                />
              ) : null}
              {item.appointmentStatus ? (
                <Detail
                  icon={<Clock3 />}
                  label={t('queues.registrationDetails.appointmentStatus')}
                  value={item.appointmentStatus}
                />
              ) : null}
            </div>
          </section>
        </div>
      ) : (
        <p className="registration-detail-loading">
          {t('queues.registrationDetails.leDetailDeCetteInscriptionEstIndisponible.')}
        </p>
      )}
    </Modal>
  );
}

function Detail({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="registration-detail-value">
      <span aria-hidden="true">{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
