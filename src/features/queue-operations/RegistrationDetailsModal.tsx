import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, Clock3, Hash, Mail, MapPin, Phone, Ticket, UserRound } from 'lucide-react';
import { Modal } from '@/design-system/components/Modal';
import { StatusBadge } from '@/design-system/components/StatusBadge';
import { usePerson } from '@/features/persons/hooks/usePersons';
import { useRegistration } from './hooks/useQueueOperations';
import { TrackingQr } from '@/features/public-experiences/TrackingQr';
import { trackingUrlFromToken } from '@/features/public-experiences/tracking-url';
import { serviceTierVisualClass } from '@/design-system/service-tier';
import { formatDate, formatDateTime } from '@/core/i18n/date-format';

const safeText = (value: unknown, fallback = '—') =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : fallback;

export function RegistrationDetailsModal({
  registrationId,
  queueName,
  open,
  onOpenChange,
}: {
  registrationId: string | null;
  queueName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, i18n } = useTranslation();
  const registration = useRegistration(registrationId, open);
  const item = registration.data?.data;
  const person = usePerson(item?.personId, open && Boolean(item));
  const customer = person.data?.data;
  const formatRegistrationDate = (value?: string, dateOnly = false) =>
    (dateOnly ? formatDate(value, i18n.language) : formatDateTime(value, i18n.language)) ?? '—';
  const status = safeText(item?.status);
  const tone =
    status === 'served'
      ? 'success'
      : status === 'waiting' || status === 'in_progress'
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
              <strong>{safeText(item.ticketNumber)}</strong>
              <span>
                {queueName ?? t('queues.registrationDetails.queueFallback', { id: item.queueId })}
              </span>
            </div>
            <div className="registration-detail-qr">
              <TrackingQr value={trackingUrlFromToken(item.registrationTrackingToken)} />
            </div>
            <StatusBadge tone={tone}>{status}</StatusBadge>
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
                    ? `${safeText(customer.firstName, '')} ${safeText(customer.lastName, '')}`.trim()
                    : `${safeText(item.firstName, '')} ${safeText(item.lastName, '')}`.trim() || '…'
                }
              />
              <Detail
                icon={<Phone />}
                label={t('common.phone')}
                value={safeText(customer?.phoneNumber)}
              />
              <Detail icon={<Mail />} label={t('common.email')} value={safeText(customer?.email)} />
              <Detail
                icon={<MapPin />}
                label={t('common.language')}
                value={
                  typeof customer?.preferredLanguage === 'string'
                    ? customer.preferredLanguage.toUpperCase()
                    : '—'
                }
              />
            </div>
          </section>
          <section className="registration-detail-section">
            <h3>
              <CalendarDays aria-hidden="true" /> {t('supervision.notifications.inscription')}
            </h3>
            <div className="registration-detail-grid">
              <Detail icon={<Hash />} label={t('common.identifier')} value={item.registrationId} />
              <Detail
                icon={<CalendarDays />}
                label={t('common.businessDate')}
                value={formatRegistrationDate(item.businessDate, true)}
              />
              <Detail
                icon={<Clock3 />}
                label={t('common.createdAt')}
                value={formatRegistrationDate(item.createdAt)}
              />
              <Detail
                icon={<Clock3 />}
                label={t('common.updatedAt')}
                value={formatRegistrationDate(item.updatedAt)}
              />
              <Detail
                icon={<Ticket />}
                label={t('common.entryType')}
                value={safeText(item.entryType)}
              />
              <Detail
                icon={<Hash />}
                label={t('common.tier')}
                value={
                  <span
                    className={`service-tier-badge ${serviceTierVisualClass(item.tierId, item.tierName)}`}
                  >
                    {item.tierName ?? `#${item.tierId}`}
                  </span>
                }
              />
              {item.scheduledTime ? (
                <Detail
                  icon={<CalendarDays />}
                  label={t('appointments.title')}
                  value={formatRegistrationDate(item.scheduledTime)}
                />
              ) : null}
              {item.appointmentStatus ? (
                <Detail
                  icon={<Clock3 />}
                  label={t('queues.registrationDetails.appointmentStatus')}
                  value={safeText(item.appointmentStatus)}
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

function Detail({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
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
