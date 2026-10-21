import { Check, PhoneCall, UserX } from 'lucide-react';
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
import { useRegistration } from '@/features/queue-operations/hooks/useQueueOperations';
import { PersonNotesButton } from '@/features/notes/PersonNotesButton';
import { Button } from '@/design-system/components/Button';

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
            <Button
              variant="unstyled"
              type="submit"
              className="button button-primary active-call-action"
              labelMode="always"
              disabled={pending}
              onClick={onServed}
            >
              <Check aria-hidden="true" />
              {t('common.servi')}
            </Button>
            <Button
              variant="unstyled"
              type="submit"
              className="button button-danger active-call-action"
              labelMode="always"
              disabled={pending}
              onClick={onNoShow}
            >
              <UserX aria-hidden="true" />
              {t('common.absent')}
            </Button>
          </div>
          {onNotes ? (
            <PersonNotesButton
              variant="cockpit"
              className="active-call-notes"
              noteCount={noteCount}
              onClick={onNotes}
            />
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
  activeCall,
  waitingCount,
  estimatedWaitMinutes,
  pending,
  onRelease,
  onOccupy,
  onCallNext,
  onFinishCall,
  onNotes,
}: {
  queue: Pick<QueueResponseDto, 'queueId' | 'queueName'>;
  session?: Pick<QueueSessionResponseDto, 'sessionId' | 'threadNumber' | 'counterName'>;
  occupied?: QueueSessionResponseDto;
  active: boolean;
  activeCall?: CallNextRegistrationResponseDto;
  waitingCount?: number;
  estimatedWaitMinutes?: number;
  pending: boolean;
  onRelease: () => void;
  onOccupy: () => void;
  onCallNext: () => void;
  onFinishCall: (
    outcome: 'served' | 'no_show',
    registration: RegistrationResponseDto | undefined,
    personName: string,
  ) => void;
  onNotes: (personId: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <Card
      className={`desk-operational-card queue-desk-card ${active || occupied ? 'has-open-desk' : 'no-open-desk'}${activeCall ? ' has-active-call' : ''}`}
    >
      <div className="queue-desk-summary">
        <div>
          <h2>{queue.queueName}</h2>
          <p>
            {waitingCount ?? '—'} {t('queue-operations.desk.enAttenteSlaEstime')}{' '}
            {estimatedWaitMinutes ?? '—'} {t('common.min')}
          </p>
        </div>
        {session ? (
          <StatusBadge tone={active ? 'success' : 'neutral'}>
            {active
              ? session.counterName ||
                t('common.counterNumber', { value0: String(session.threadNumber) })
              : t('queue-operations.desk.consultation')}
          </StatusBadge>
        ) : null}
      </div>

      {activeCall ? (
        <QueueActiveCall
          call={activeCall}
          pending={pending}
          onFinishCall={onFinishCall}
          onNotes={onNotes}
        />
      ) : session ? (
        <>
          <Button
            variant="unstyled"
            type="submit"
            className="button"
            disabled={pending}
            onClick={onRelease}
          >
            {t('queue-operations.desk.liberer')}
          </Button>
          <Button
            variant="unstyled"
            type="submit"
            className="button button-primary"
            labelMode="always"
            disabled={!active || pending}
            onClick={onCallNext}
          >
            <PhoneCall aria-hidden="true" />
            <span className="button-label">{t('queue-operations.desk.appelerLeSuivant')}</span>
          </Button>
        </>
      ) : (
        <Button
          variant="unstyled"
          type="submit"
          className="button"
          disabled={pending}
          onClick={onOccupy}
        >
          {occupied
            ? t('queue-operations.desk.reprendreLeGuichet')
            : t('queue-operations.desk.occuperLeGuichet')}
        </Button>
      )}
    </Card>
  );
}

function QueueActiveCall({
  call,
  pending,
  onFinishCall,
  onNotes,
}: {
  call: CallNextRegistrationResponseDto;
  pending: boolean;
  onFinishCall: (
    outcome: 'served' | 'no_show',
    registration: RegistrationResponseDto | undefined,
    personName: string,
  ) => void;
  onNotes: (personId: number) => void;
}) {
  const { t } = useTranslation();
  const registration = useRegistration(call.registrationId);
  const personId = registration.data?.data.personId;
  const noteCount = registration.data?.data.activeNoteCount ?? 0;
  const personName = [registration.data?.data.firstName, registration.data?.data.lastName]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(' ');

  return (
    <div className="queue-card-active-call">
      <div className="active-call-heading">
        <div>
          <small>{t('queue-operations.desk.ticketEnCours')}</small>
          <strong>{call.ticketNumber}</strong>
        </div>
        <span className="queue-card-person">
          {personName || t('queue-operations.desk.personneNonRenseignee')}
        </span>
      </div>
      {registration.data?.data ? (
        <dl className="active-call-metrics">
          <div>
            <dt>{t('queue-operations.desk.arrivee')}</dt>
            <dd>
              {new Intl.DateTimeFormat(undefined, {
                hour: '2-digit',
                minute: '2-digit',
              }).format(new Date(registration.data.data.createdAt))}
            </dd>
          </div>
          <div>
            <dt>{t('queue-operations.desk.attenteAvantAppel')}</dt>
            <dd>
              {Math.max(
                0,
                Math.floor(
                  (new Date(call.calledAt).getTime() -
                    new Date(registration.data.data.createdAt).getTime()) /
                    60000,
                ),
              )}{' '}
              {t('common.min')}
            </dd>
          </div>
        </dl>
      ) : null}
      <div className="queue-card-call-actions">
        <Button
          variant="unstyled"
          className="button button-primary"
          labelMode="always"
          type="button"
          disabled={pending}
          onClick={() => {
            onFinishCall('served', registration.data?.data, personName);
          }}
        >
          <Check aria-hidden="true" />
          <span className="button-label">{t('common.servi')}</span>
        </Button>
        <Button
          variant="unstyled"
          className="button button-danger"
          labelMode="always"
          type="button"
          disabled={pending}
          onClick={() => {
            onFinishCall('no_show', registration.data?.data, personName);
          }}
        >
          <UserX aria-hidden="true" />
          <span className="button-label">{t('common.absent')}</span>
        </Button>
        {personId ? (
          <PersonNotesButton
            variant="cockpit"
            noteCount={noteCount}
            onClick={() => {
              onNotes(personId);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
