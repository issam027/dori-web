
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ChevronDown, Clock3, DoorOpen, MonitorUp, PhoneCall, RefreshCw, Star, UserX } from 'lucide-react';
import { type CockpitQueueItemDto } from '@/api/generated/models';
import { formatDateTime } from '@/core/i18n/date-format';
import { Button } from '@/design-system/components/Button';
import { StatusBadge } from '@/design-system/components/StatusBadge';
import { elapsedMinutes } from '../hooks/useServerClock';
import { asDate, personName } from '../model/cockpit-presentation';
export function QueueCard(props: {
  queue: CockpitQueueItemDto;
  pending: boolean;
  locale: string;
  serverNow: number;
  favorite: boolean;
  collapsed: boolean;
  onToggleFavorite: () => void;
  onToggleCollapsed: () => void;
  onOpenSession: () => void;
  onCloseSession: () => void;
  onCallNext: () => void;
  onRecall: () => void;
  onServed: () => void;
  onNoShow: () => void;
  onNotes: (
    person: { personId: string; firstName: string | null; lastName: string | null },
    mode?: 'view' | 'add',
  ) => void;
  onDetails: (registrationId: string) => void;
}) {
  const { t } = useTranslation();
  const { queue } = props;
  const mine = queue.sessions.find(
    (session) => session.sessionId === queue.currentOperatorSessionId,
  );
  const activeCall = queue.activeCall;
  const nextUnavailableReason = queue.centralizedNext.eligible
    ? undefined
    : queue.centralizedNext.unavailableReason === 'active_call_in_progress'
      ? t('cockpit.unavailableActiveCall')
      : t('cockpit.unavailableNoSession');
  return (
    <article
      id={`cockpit-queue-${queue.queueId}`}
      className={`card cockpit-queue-card${activeCall ? ' has-active-call' : ''}${props.collapsed ? ' is-collapsed' : ''}`}
    >
      <header>
        <div className="cockpit-queue-code">{queue.queueCode}</div>
        <div>
          <h3>{queue.queueName}</h3>
          <p>
            {mine
              ? (mine.counterName ?? t('cockpit.counterNumber', { number: mine.threadNumber }))
              : t('cockpit.noOpenSession')}
          </p>
        </div>
        <StatusBadge tone={mine ? 'success' : 'accent'}>
          {mine ? t('cockpit.sessionActive') : t('cockpit.available')}
        </StatusBadge>
        <div className="cockpit-queue-card-controls">
          <Button
            size="icon"
            icon={<Star fill={props.favorite ? 'currentColor' : 'none'} />}
            label={props.favorite ? t('cockpit.removeFavorite') : t('cockpit.addFavorite')}
            labelMode="icon-only"
            aria-pressed={props.favorite}
            onClick={props.onToggleFavorite}
          />
          <Button
            size="icon"
            icon={<ChevronDown />}
            label={props.collapsed ? t('cockpit.expandQueue') : t('cockpit.collapseQueue')}
            labelMode="icon-only"
            aria-expanded={!props.collapsed}
            onClick={props.onToggleCollapsed}
          />
        </div>
      </header>
      {props.collapsed ? (
        <div className="cockpit-collapsed-summary">
          <span>
            <strong>{queue.waitingCount}</strong> {t('cockpit.waiting')}
          </span>
          <span>
            {queue.estimatedWaitMinutes == null ? '—' : `${String(queue.estimatedWaitMinutes)} min`}
          </span>
          <span>{mine ? t('cockpit.sessionActive') : t('cockpit.noOpenSession')}</span>
          {activeCall ? (
            <strong>
              {activeCall.ticketNumber} · {t('cockpit.currentCall')}
            </strong>
          ) : null}
        </div>
      ) : null}
      <div className="cockpit-queue-card-body">
        <div className="cockpit-queue-stats">
          <div>
            <strong>{queue.waitingCount}</strong>
            <small>{t('cockpit.waiting')}</small>
          </div>
          <div>
            <strong>
              {queue.estimatedWaitMinutes == null
                ? '—'
                : `${String(queue.estimatedWaitMinutes)} min`}
            </strong>
            <small>{t('cockpit.estimatedWait')}</small>
          </div>
          <div>
            <strong>
              {queue.occupiedThreadsCount}/{queue.threadCount}
            </strong>
            <small>{t('cockpit.occupiedCounters')}</small>
          </div>
        </div>
        {queue.sessions.length ? (
          <div className="cockpit-session-roster">
            <strong>{t('cockpit.openCounters')}</strong>
            <div>
              {queue.sessions.map((session) => (
                <span
                  key={session.sessionId}
                  className={session.ownedByCurrentOperator ? 'is-mine' : undefined}
                >
                  {session.counterName ??
                    t('cockpit.counterNumber', { number: session.threadNumber })}{' '}
                  · {session.operatorName}
                  {session.ownedByCurrentOperator ? ` · ${t('cockpit.me')}` : ''}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        {activeCall ? (
          <section className="cockpit-active-call">
            <div className="cockpit-active-heading">
              <div>
                <small>{t('cockpit.currentCall')}</small>
                <strong>{activeCall.ticketNumber}</strong>
              </div>
              <span>{activeCall.tier.tierName}</span>
            </div>
            <h4>
              {personName(activeCall.person) || t('queue-operations.desk.personneNonRenseignee')}
            </h4>
            <p>
              <Clock3 aria-hidden="true" />{' '}
              {t('cockpit.calledSince', {
                time: formatDateTime(asDate(activeCall.calledAt), props.locale) ?? '—',
                duration: t('cockpit.elapsedMinutes', {
                  count: elapsedMinutes(activeCall.calledAt, props.serverNow) ?? 0,
                }),
              })}
            </p>
            {activeCall.recallCount > 0 ? (
              <p>
                {t('cockpit.recallSummary', {
                  count: activeCall.recallCount,
                  time: formatDateTime(activeCall.lastRecalledAt, props.locale) ?? '—',
                })}
              </p>
            ) : null}
            <div className="cockpit-call-actions">
              <Button
                icon={<RefreshCw />}
                label={t('cockpit.recall')}
                variant="info"
                disabled={props.pending}
                onClick={props.onRecall}
              />
              <Button
                icon={<CheckCircle2 />}
                label={t('cockpit.served')}
                variant="success"
                disabled={props.pending}
                onClick={props.onServed}
              />
              <Button
                icon={<UserX />}
                label={t('cockpit.noShow')}
                variant="danger"
                disabled={props.pending}
                onClick={props.onNoShow}
              />
            </div>
            <div className="cockpit-note-actions">
              <Button
                label={t('cockpit.viewNotes', { count: activeCall.notesCount })}
                onClick={() => {
                  props.onNotes(activeCall.person);
                }}
              />
              <Button
                label={t('cockpit.addNote')}
                onClick={() => {
                  props.onNotes(activeCall.person, 'add');
                }}
              />
            </div>
            <Button
              label={t('cockpit.openCustomerFile')}
              onClick={() => {
                props.onDetails(activeCall.registrationId);
              }}
            />
          </section>
        ) : (
          <section
            className={`cockpit-candidates${queue.nextCandidates.length ? '' : ' is-empty'}`}
          >
            <div>
              <strong>{t('cockpit.nextCandidates')}</strong>
              <small>{t('cockpit.previewOnly')}</small>
            </div>
            {queue.nextCandidates.length ? (
              queue.nextCandidates.map((candidate, index) => (
                <div
                  className="cockpit-candidate"
                  key={`${candidate.ticketNumber}-${String(index)}`}
                >
                  <span>{candidate.ticketNumber}</span>
                  <small>
                    {candidate.tier.tierName}
                    {candidate.entryType === 'appointment' ? ` · ${t('cockpit.appointment')}` : ''}
                  </small>
                </div>
              ))
            ) : (
              <p>{t('cockpit.queueEmpty')}</p>
            )}
          </section>
        )}
        {!activeCall ? (
          <footer>
            {mine ? (
              <Button
                icon={<DoorOpen />}
                label={t('cockpit.closeSession')}
                disabled={props.pending}
                onClick={props.onCloseSession}
              />
            ) : (
              <Button
                icon={<MonitorUp />}
                label={t('cockpit.openSession')}
                disabled={props.pending || !queue.sessionOpening.allowed}
                unavailableReason={
                  !queue.sessionOpening.allowed ? t('cockpit.sessionUnavailable') : undefined
                }
                onClick={props.onOpenSession}
              />
            )}
            <Button
              variant="primary"
              icon={<PhoneCall />}
              label={t('cockpit.callFromQueue')}
              disabled={props.pending || !queue.centralizedNext.eligible}
              unavailableReason={nextUnavailableReason}
              onClick={props.onCallNext}
            />
          </footer>
        ) : null}
      </div>
    </article>
  );
}