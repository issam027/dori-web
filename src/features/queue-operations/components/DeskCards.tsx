import { Check, PhoneCall, StickyNote, UserX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type {
  CallNextRegistrationResponseDto,
  QueuePreviewItemDto,
  QueueResponseDto,
  QueueSessionResponseDto,
  RegistrationResponseDto,
} from '@/api/generated/models';
import { Card } from '@/design-system/components/Card';
import { StatusBadge } from '@/design-system/components/StatusBadge';

export function EligiblePreviewCard({ items }: { items: readonly QueuePreviewItemDto[] }) {
  const { t } = useTranslation();
  return (
    <Card className="desk-operational-card desk-preview-card">
      <h2>{t('queue-operations.desk.prochainsEligibles')}</h2>
      <div className="preview-list">
        {items.map((item) => (
          <span key={item.registrationId}>
            <strong>{item.ticketNumber}</strong> · {item.queueName} · {item.person.firstName}{' '}
            {item.person.lastName}
          </span>
        ))}
      </div>
    </Card>
  );
}

export function ActiveCallCard({
  call,
  registration,
  personName,
  noteCount,
  pending,
  onServed,
  onNoShow,
  onNotes,
}: {
  call: CallNextRegistrationResponseDto | null;
  registration?: RegistrationResponseDto;
  personName: string;
  noteCount: number;
  pending: boolean;
  onServed: () => void;
  onNoShow: () => void;
  onNotes?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Card className="desk-operational-card desk-active-card">
      <h2>{t('queue-operations.desk.priseEnCharge')}</h2>
      {call ? (
        <div className="active-call">
          <div className="active-call-heading">
            <div>
              <small>{t('queue-operations.desk.ticketEnCours')}</small>
              <strong>{call.ticketNumber}</strong>
            </div>
            <StatusBadge tone="accent">
              {t('common.guichet')}
              {call.threadNumber}
            </StatusBadge>
          </div>
          <h3 className="active-person-name">
            {personName || t('queue-operations.desk.personneNonRenseignee')}
          </h3>
          {registration ? (
            <dl className="active-call-metrics">
              <div>
                <dt>{t('queue-operations.desk.arrivee')}</dt>
                <dd>
                  {new Intl.DateTimeFormat(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  }).format(new Date(registration.createdAt))}
                </dd>
              </div>
              <div>
                <dt>{t('queue-operations.desk.attenteAvantAppel')}</dt>
                <dd>
                  {Math.max(
                    0,
                    Math.floor(
                      (new Date(call.calledAt).getTime() -
                        new Date(registration.createdAt).getTime()) /
                        60000,
                    ),
                  )}{' '}
                  {t('common.min')}
                </dd>
              </div>
            </dl>
          ) : null}
          <div className="active-call-primary-actions">
            <button
              className="button button-primary active-call-action"
              disabled={pending}
              onClick={onServed}
            >
              <Check aria-hidden="true" />
              {t('common.servi')}
            </button>
            <button
              className="button button-danger active-call-action"
              disabled={pending}
              onClick={onNoShow}
            >
              <UserX aria-hidden="true" />
              {t('common.absent')}
            </button>
          </div>
          {onNotes ? (
            <button className="button active-call-notes" type="button" onClick={onNotes}>
              <StickyNote aria-hidden="true" />
              {t('queue-operations.desk.consulterLesNotes')}
              <span
                className="note-count"
                aria-label={t('persons.notes.count', { count: noteCount })}
              >
                {noteCount}
              </span>
            </button>
          ) : null}
        </div>
      ) : (
        <p>{t('queue-operations.desk.aucunePersonneEnCours')}</p>
      )}
    </Card>
  );
}

export function QueueDeskCard({
  queue,
  session,
  occupied,
  active,
  waitingCount,
  estimatedWaitMinutes,
  pending,
  hasActiveCall,
  onRelease,
  onOccupy,
  onCallNext,
}: {
  queue: QueueResponseDto;
  session?: QueueSessionResponseDto;
  occupied?: QueueSessionResponseDto;
  active: boolean;
  waitingCount?: number;
  estimatedWaitMinutes?: number;
  pending: boolean;
  hasActiveCall: boolean;
  onRelease: () => void;
  onOccupy: () => void;
  onCallNext: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Card
      className={`desk-operational-card queue-desk-card ${active || occupied ? 'has-open-desk' : 'no-open-desk'}`}
    >
      <h2>{queue.queueName}</h2>
      <p>
        {waitingCount ?? '—'} {t('queue-operations.desk.enAttenteSlaEstime')}{' '}
        {estimatedWaitMinutes ?? '—'} {t('common.min')}
      </p>
      {session ? (
        <>
          <StatusBadge tone={active ? 'success' : 'neutral'}>
            {active
              ? t('common.counterNumber', {
                  value0: String(session.threadNumber),
                })
              : t('queue-operations.desk.consultation')}
          </StatusBadge>
          <button className="button" disabled={pending || hasActiveCall} onClick={onRelease}>
            {t('queue-operations.desk.liberer')}
          </button>
        </>
      ) : (
        <button className="button" disabled={pending} onClick={onOccupy}>
          {occupied
            ? t('queue-operations.desk.reprendreLeGuichet')
            : t('queue-operations.desk.occuperLeGuichet')}
        </button>
      )}
      <button
        className="button button-primary"
        disabled={!active || hasActiveCall || pending}
        onClick={onCallNext}
      >
        <PhoneCall aria-hidden="true" />
        {t('queue-operations.desk.appelerLeSuivant')}
      </button>
    </Card>
  );
}
