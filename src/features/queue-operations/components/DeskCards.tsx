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
      <h2>{t('ui.queue-operations.desk_page.prochains_eligibles_14q7gdk')}</h2>
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
      <h2>{t('ui.queue-operations.desk_page.prise_en_charge_140wd1j')}</h2>
      {call ? (
        <div className="active-call">
          <div className="active-call-heading">
            <div>
              <small>{t('ui.queue-operations.desk_page.ticket_en_cours_12vcptu')}</small>
              <strong>{call.ticketNumber}</strong>
            </div>
            <StatusBadge tone="accent">
              {t('ui.queue-operations.desk_page.guichet_15ztv8y')}
              {call.threadNumber}
            </StatusBadge>
          </div>
          <h3 className="active-person-name">
            {personName ||
              t('ui.expression.queue-operations.desk_page.personne_non_renseignee_1306yk1')}
          </h3>
          {registration ? (
            <dl className="active-call-metrics">
              <div>
                <dt>{t('ui.queue-operations.desk_page.arrivee_8ef051')}</dt>
                <dd>
                  {new Intl.DateTimeFormat(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  }).format(new Date(registration.createdAt))}
                </dd>
              </div>
              <div>
                <dt>{t('ui.queue-operations.desk_page.attente_avant_appel_1k7uziu')}</dt>
                <dd>
                  {Math.max(
                    0,
                    Math.floor(
                      (new Date(call.calledAt).getTime() -
                        new Date(registration.createdAt).getTime()) /
                        60000,
                    ),
                  )}{' '}
                  {t('ui.queue-operations.desk_page.min_1jxbmtz')}
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
              {t('ui.queue-operations.desk_page.servi_1bextlc')}
            </button>
            <button
              className="button button-danger active-call-action"
              disabled={pending}
              onClick={onNoShow}
            >
              <UserX aria-hidden="true" />
              {t('ui.queue-operations.desk_page.absent_meu720')}
            </button>
          </div>
          {onNotes ? (
            <button className="button active-call-notes" type="button" onClick={onNotes}>
              <StickyNote aria-hidden="true" />
              {t('ui.queue-operations.desk_page.consulter_les_notes_esjdmp')}
              <span className="note-count" aria-label={`${String(noteCount)} note(s)`}>
                {noteCount}
              </span>
            </button>
          ) : null}
        </div>
      ) : (
        <p>{t('ui.queue-operations.desk_page.aucune_personne_en_cours_rsgt2z')}</p>
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
        {waitingCount ?? '—'} {t('ui.queue-operations.desk_page.en_attente_sla_estime_1k6oejn')}{' '}
        {estimatedWaitMinutes ?? '—'} {t('ui.queue-operations.desk_page.min_1jxbmtz')}
      </p>
      {session ? (
        <>
          <StatusBadge tone={active ? 'success' : 'neutral'}>
            {active
              ? t('ui.expression.queue-operations.desk_page.guichet_value0_1v9uvfd', {
                  value0: String(session.threadNumber),
                })
              : t('ui.expression.queue-operations.desk_page.consultation_1xb0x0k')}
          </StatusBadge>
          <button className="button" disabled={pending || hasActiveCall} onClick={onRelease}>
            {t('ui.queue-operations.desk_page.liberer_icbzzg')}
          </button>
        </>
      ) : (
        <button className="button" disabled={pending} onClick={onOccupy}>
          {occupied
            ? t('ui.expression.queue-operations.desk_page.reprendre_le_guichet_1mzik24')
            : t('ui.expression.queue-operations.desk_page.occuper_le_guichet_eenwno')}
        </button>
      )}
      <button
        className="button button-primary"
        disabled={!active || hasActiveCall || pending}
        onClick={onCallNext}
      >
        <PhoneCall aria-hidden="true" />
        {t('ui.queue-operations.desk_page.appeler_le_suivant_1q7561l')}
      </button>
    </Card>
  );
}
