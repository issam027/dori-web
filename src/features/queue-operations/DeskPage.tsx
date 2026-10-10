import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSessionStore } from '@/core/auth/session-store';
import { useScopeStore } from '@/core/scope/scope-store';
import { Card } from '@/design-system/components/Card';
import { EmptyState } from '@/design-system/components/FeedbackState';
import { PageHeader } from '@/design-system/components/PageHeader';
import { StatusBadge } from '@/design-system/components/StatusBadge';
import { canCallNext, useOperationStore } from './operation-store';
import { QuickRegistration } from './QuickRegistration';
import { PersonNotesViewer } from '@/features/persons/PersonNotesViewer';
import { notifyError } from '@/core/notifications/error-presentation';
import { notify } from '@/core/notifications/notification-store';
import { invalidateQueueOperations } from '@/api/client/query-invalidations';
import { usePerson, usePersonNotes } from '@/features/persons/hooks/usePersons';
import { useQueues, useQueueStatuses } from '@/features/queues/hooks/useQueues';
import {
  useCallNext,
  useCloseDeskSession,
  useDeskSession,
  useMarkNoShow,
  useMarkServed,
  useOpenDeskSession,
  useRegistration,
} from './hooks/useQueueOperations';
import { PassagePrintDocument } from './PassagePrintDocument';
import { useSite } from '@/features/portfolio/hooks/useSites';

export function DeskPage() {
  const { t: __t } = useTranslation();
  const queryClient = useQueryClient();
  const user = useSessionStore((state) => state.user);
  const siteId = useScopeStore((state) => state.activeSiteId);
  const site = useSite(siteId);
  const activeCall = useOperationStore((state) => state.activeCall);
  const passages = useOperationStore((state) => state.passages);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [printingPassageId, setPrintingPassageId] = useState<number | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const activeRegistration = useRegistration(activeCall?.registrationId, activeCall !== null);
  const activePersonId = activeRegistration.data?.data.personId;
  const activePerson = usePerson(activePersonId);
  const activePersonNotes = usePersonNotes(activePersonId ?? 0, {
    enabled: Boolean(activePersonId),
    pageSize: 1,
    usage: 'count',
  });
  const printingPassage = passages.find((passage) => passage.registrationId === printingPassageId);

  useEffect(() => {
    if (!printingPassage) return;
    document.body.dataset.printPassage = String(printingPassage.registrationId);
    const finishPrinting = () => {
      delete document.body.dataset.printPassage;
      setPrintingPassageId(null);
    };
    window.addEventListener('afterprint', finishPrinting, { once: true });
    const timer = window.setTimeout(() => {
      window.print();
    }, 50);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('afterprint', finishPrinting);
      delete document.body.dataset.printPassage;
    };
  }, [printingPassage]);
  const queues = useQueues({ siteId, isActive: true });
  const allowed =
    queues.data?.data.items.filter(
      (queue) => user?.scope.isGlobal || user?.scope.queueIds.includes(queue.queueId),
    ) ?? [];
  const { previews, sessions, threads } = useDeskSession(
    siteId,
    allowed.map((queue) => queue.queueId),
  );
  const deskSessionsLoading = sessions.some((session) => session.isPending);
  const hasActiveDeskSession = sessions.some((session) =>
    session.data?.data.items.some(
      (deskSession) =>
        deskSession.userId === user?.userId &&
        deskSession.mode === 'active' &&
        deskSession.threadNumber != null,
    ),
  );
  const statuses = useQueueStatuses(allowed.map((queue) => queue.queueId));
  const callNext = useCallNext();
  const markServed = useMarkServed();
  const markNoShow = useMarkNoShow();
  const openSession = useOpenDeskSession();
  const closeSession = useCloseDeskSession();
  const rankedQueues = allowed
    .map((queue, index) => ({ queue, index }))
    .sort((left, right) => {
      const hasActiveSession = (index: number) =>
        sessions[index]?.data?.data.items.some((session) => session.mode === 'active') ?? false;
      return Number(hasActiveSession(right.index)) - Number(hasActiveSession(left.index));
    });
  const serverCurrent = threads
    .flatMap((query) => query.data?.data.items ?? [])
    .find(
      (thread) =>
        thread.session?.userId === user?.userId && Boolean(thread.session?.currentRegistrationId),
    );
  const serverCurrentSession = serverCurrent?.session;
  const serverCurrentRegistrationId = serverCurrentSession?.currentRegistrationId ?? null;
  const serverCurrentRegistration = useRegistration(serverCurrentRegistrationId);
  const passageRegistrationIds = passages.map((passage) => passage.registrationId).join(',');
  useEffect(() => {
    if (
      activeCall ||
      !serverCurrentRegistrationId ||
      !serverCurrentSession ||
      passages.some((passage) => passage.registrationId === serverCurrentRegistrationId)
    )
      return;
    const data = serverCurrentRegistration.data?.data;
    if (!data || !['called', 'in_progress'].includes(data.status)) return;
    useOperationStore.getState().startCall({
      registrationId: data.registrationId,
      ticketNumber: data.ticketNumber,
      entryType: data.entryType,
      scheduledTime: data.scheduledTime,
      calledEarly: false,
      tier: { tierId: data.tierId },
      status: data.status,
      sessionId: serverCurrentSession.sessionId,
      threadNumber: serverCurrent.threadNumber,
      priorityScore: 0,
      calledAt: data.updatedAt,
      person: { personId: data.personId },
    });
  }, [
    activeCall,
    passageRegistrationIds,
    passages,
    serverCurrent,
    serverCurrentRegistrationId,
    serverCurrentRegistration.data,
    serverCurrentSession,
  ]);
  const refresh = () => invalidateQueueOperations(queryClient);
  const run = async (action: () => Promise<void>) => {
    setPending(true);
    setError('');
    try {
      await action();
    } catch (cause) {
      notifyError(cause);
      setError(
        (cause as { status?: number }).status === 409
          ? __t('states.conflict')
          : __t('errors.actionImpossible'),
      );
      await refresh();
    } finally {
      setPending(false);
    }
  };
  const close = (outcome: 'served' | 'no_show') => {
    if (!activeCall) return;
    const call = activeCall;
    const registration = activeRegistration.data?.data;
    const personName = [activePerson.data?.data.firstName, activePerson.data?.data.lastName]
      .filter((part): part is string => Boolean(part?.trim()))
      .join(' ');
    void run(async () => {
      if (outcome === 'served') await markServed.execute(call.registrationId);
      else await markNoShow.execute(call.registrationId);
      useOperationStore.getState().closeCall();
      useOperationStore.getState().addPassage({
        registrationId: call.registrationId,
        ticketNumber: call.ticketNumber,
        personName: personName || 'Personne non renseignée',
        arrivedAt: registration?.createdAt,
        calledAt: call.calledAt,
        closedAt: new Date().toISOString(),
        threadNumber: call.threadNumber,
        outcome,
      });
      notify({
        tone: 'success',
        title:
          outcome === 'served'
            ? __t('notifications.visit.served')
            : __t('notifications.visit.noShow'),
        message: __t('notifications.visit.closedMessage', { ticket: call.ticketNumber }),
      });
      await refresh();
    });
  };
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Opérations"
        title={__t('ui.queue-operations.desk_page.cockpit_guichet_o7323f')}
        description={
          deskSessionsLoading
            ? undefined
            : hasActiveDeskSession
              ? __t('desk.activeSessionDescription')
              : __t(
                  'ui.queue-operations.desk_page.une_session_active_est_requise_pour_appeler_le_p_3hwh4',
                )
        }
      />
      {queues.isSuccess && allowed.length === 0 ? (
        <EmptyState
          title={__t('ui.queue-operations.desk_page.aucune_file_active_12limf6')}
          description={__t(
            'ui.queue-operations.desk_page.aucune_file_n_est_configuree_ou_active_pour_ce_s_10fp5h5',
          )}
        />
      ) : null}
      {siteId !== null && allowed.length > 0 ? (
        <QuickRegistration siteId={siteId} queues={allowed} />
      ) : null}
      {error ? (
        <p role="alert" className="field-error">
          {error}
        </p>
      ) : null}
      {allowed.length > 0 ? (
        <div className="desk-card-grid">
          <Card className="desk-operational-card desk-preview-card">
            <h2>{__t('ui.queue-operations.desk_page.prochains_eligibles_14q7gdk')}</h2>
            <div className="preview-list">
              {previews.data?.data.map((item) => (
                <span key={item.registrationId}>
                  <strong>{item.ticketNumber}</strong> · {item.queueName} · {item.person.firstName}{' '}
                  {item.person.lastName}
                </span>
              ))}
            </div>
          </Card>
          <Card className="desk-operational-card desk-active-card">
            <h2>{__t('ui.queue-operations.desk_page.prise_en_charge_140wd1j')}</h2>
            {activeCall ? (
              <div className="active-call">
                <div className="active-call-heading">
                  <div>
                    <small>{__t('ui.queue-operations.desk_page.ticket_en_cours_12vcptu')}</small>
                    <strong>{activeCall.ticketNumber}</strong>
                  </div>
                  <StatusBadge tone="accent">
                    {__t('ui.queue-operations.desk_page.guichet_15ztv8y')}
                    {activeCall.threadNumber}
                  </StatusBadge>
                </div>
                <h3 className="active-person-name">
                  {[activePerson.data?.data.firstName, activePerson.data?.data.lastName]
                    .filter((part): part is string => Boolean(part?.trim()))
                    .join(' ') ||
                    __t('ui.expression.queue-operations.desk_page.personne_non_renseignee_1306yk1')}
                </h3>
                {activeRegistration.data ? (
                  <dl className="active-call-metrics">
                    <div>
                      <dt>{__t('ui.queue-operations.desk_page.arrivee_8ef051')}</dt>
                      <dd>
                        {new Intl.DateTimeFormat(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                        }).format(new Date(activeRegistration.data.data.createdAt))}
                      </dd>
                    </div>
                    <div>
                      <dt>{__t('ui.queue-operations.desk_page.attente_avant_appel_1k7uziu')}</dt>
                      <dd>
                        {Math.max(
                          0,
                          Math.floor(
                            (new Date(activeCall.calledAt).getTime() -
                              new Date(activeRegistration.data.data.createdAt).getTime()) /
                              60000,
                          ),
                        )}{' '}
                        {__t('ui.queue-operations.desk_page.min_1jxbmtz')}
                      </dd>
                    </div>
                  </dl>
                ) : null}
                <div className="active-call-primary-actions">
                  <button
                    className="button button-primary active-call-action"
                    disabled={pending}
                    onClick={() => {
                      close('served');
                    }}
                  >
                    {__t('ui.queue-operations.desk_page.servi_1bextlc')}
                  </button>
                  <button
                    className="button button-danger active-call-action"
                    disabled={pending}
                    onClick={() => {
                      close('no_show');
                    }}
                  >
                    {__t('ui.queue-operations.desk_page.absent_meu720')}
                  </button>
                </div>
                {activePersonId ? (
                  <button
                    className="button active-call-notes"
                    type="button"
                    onClick={() => {
                      setNotesOpen(true);
                    }}
                  >
                    {__t('ui.queue-operations.desk_page.consulter_les_notes_esjdmp')}
                    <span
                      className="note-count"
                      aria-label={`${String(activePersonNotes.data?.data.total ?? 0)} note(s)`}
                    >
                      {activePersonNotes.data?.data.total ?? 0}
                    </span>
                  </button>
                ) : null}
              </div>
            ) : (
              <p>{__t('ui.queue-operations.desk_page.aucune_personne_en_cours_rsgt2z')}</p>
            )}
          </Card>
          {rankedQueues.map(({ queue, index }) => {
            const mine = sessions[index]?.data?.data.items.find(
              (session) => session.userId === user?.userId,
            );
            const occupied = sessions[index]?.data?.data.items.find(
              (session) => session.mode === 'active' && session.userId !== user?.userId,
            );
            const active = mine?.mode === 'active' && mine.threadNumber != null;
            return (
              <Card
                key={queue.queueId}
                className={`desk-operational-card queue-desk-card ${active || occupied ? 'has-open-desk' : 'no-open-desk'}`}
              >
                <h2>{queue.queueName}</h2>
                <p>
                  {statuses[index]?.data?.data.waitingCount ?? '—'}{' '}
                  {__t('ui.queue-operations.desk_page.en_attente_sla_estime_1k6oejn')}{' '}
                  {statuses[index]?.data?.data.estimatedWaitMinutes ?? '—'}{' '}
                  {__t('ui.queue-operations.desk_page.min_1jxbmtz')}
                </p>
                {mine ? (
                  <>
                    <StatusBadge tone={active ? 'success' : 'neutral'}>
                      {active
                        ? __t('ui.expression.queue-operations.desk_page.guichet_value0_1v9uvfd', {
                            value0: String(mine.threadNumber),
                          })
                        : __t('ui.expression.queue-operations.desk_page.consultation_1xb0x0k')}
                    </StatusBadge>
                    <button
                      className="button"
                      disabled={pending || Boolean(activeCall)}
                      onClick={() => {
                        void run(async () => {
                          await closeSession.execute({
                            queueId: queue.queueId,
                            sessionId: mine.sessionId,
                          });
                          notify({
                            tone: 'success',
                            title: __t('notifications.desk.released'),
                            message: queue.queueName,
                          });
                          await refresh();
                        });
                      }}
                    >
                      {__t('ui.queue-operations.desk_page.liberer_icbzzg')}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="button"
                      disabled={pending}
                      onClick={() => {
                        const takeOver =
                          Boolean(occupied) &&
                          window.confirm(
                            __t(
                              'ui.expression.queue-operations.desk_page.ce_guichet_est_occupe_confirmer_la_reprise_hnywz6',
                            ),
                          );
                        if (occupied && !takeOver) return;
                        void run(async () => {
                          await openSession.execute({
                            queueId: queue.queueId,
                            dto: {
                              mode: 'active',
                              threadNumber: occupied?.threadNumber ?? 1,
                              takeOver,
                            },
                          });
                          notify({
                            tone: 'success',
                            title: occupied
                              ? __t('notifications.desk.takenOver')
                              : __t('notifications.desk.opened'),
                            message: queue.queueName,
                          });
                          await refresh();
                        });
                      }}
                    >
                      {occupied
                        ? __t(
                            'ui.expression.queue-operations.desk_page.reprendre_le_guichet_1mzik24',
                          )
                        : __t('ui.expression.queue-operations.desk_page.occuper_le_guichet_eenwno')}
                    </button>
                  </>
                )}
                <button
                  className="button button-primary"
                  disabled={!canCallNext(active, activeCall, pending)}
                  onClick={() => {
                    void run(async () => {
                      const outcome = await callNext.execute(queue.queueId);
                      if (outcome === 'empty') {
                        notify({
                          tone: 'info',
                          title: __t('notifications.queue.empty'),
                          message: __t('notifications.queue.emptyMessage', {
                            queue: queue.queueName,
                          }),
                        });
                        await refresh();
                        return;
                      }
                      notify({
                        tone: 'success',
                        title: __t('notifications.visit.called'),
                        message: queue.queueName,
                      });
                      await refresh();
                    });
                  }}
                >
                  {__t('ui.queue-operations.desk_page.appeler_le_suivant_1q7561l')}
                </button>
              </Card>
            );
          })}
        </div>
      ) : null}
      {notesOpen && activeRegistration.data ? (
        <PersonNotesViewer
          personId={activeRegistration.data.data.personId}
          open
          onOpenChange={setNotesOpen}
        />
      ) : null}
      {passages.length > 0 ? (
        <section className="passage-summary" aria-labelledby="passage-summary-title">
          <div className="passage-summary-heading">
            <div>
              <span className="eyebrow">
                {__t('ui.queue-operations.desk_page.session_en_cours_1tmgxtg')}
              </span>
              <h2 id="passage-summary-title">
                {__t('ui.queue-operations.desk_page.recapitulatif_des_passages_d3ru2n')}
              </h2>
            </div>
            <StatusBadge tone="neutral">
              {passages.length} {__t('ui.queue-operations.desk_page.passage_s_1rhvk1p')}
            </StatusBadge>
          </div>
          <div className="passage-summary-grid">
            {passages.map((passage) => {
              const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
              const timeFormatter = new Intl.DateTimeFormat(undefined, {
                hour: '2-digit',
                minute: '2-digit',
              });
              return (
                <article
                  className="passage-summary-card"
                  key={`${String(passage.registrationId)}-${passage.closedAt}`}
                >
                  <header>
                    <div>
                      <small>
                        {passage.ticketNumber} {__t('ui.queue-operations.desk_page.guichet_gvzfu7')}
                        {passage.threadNumber}
                      </small>
                      <h3>{passage.personName}</h3>
                    </div>
                    <StatusBadge tone={passage.outcome === 'served' ? 'success' : 'neutral'}>
                      {passage.outcome === 'served'
                        ? __t('ui.expression.queue-operations.desk_page.servi_1bextlc')
                        : __t('ui.expression.queue-operations.desk_page.absent_meu720')}
                    </StatusBadge>
                  </header>
                  <div className="passage-print-header" aria-hidden="true">
                    <strong>
                      {__t('ui.queue-operations.desk_page.dori_justificatif_de_passage_13e6u9q')}
                    </strong>
                    <span>
                      {__t('ui.queue-operations.desk_page.imprime_le_wx6ut5')}{' '}
                      {new Intl.DateTimeFormat(undefined, {
                        dateStyle: 'long',
                        timeStyle: 'short',
                      }).format(new Date())}
                    </span>
                  </div>
                  <dl>
                    <div>
                      <dt>{__t('ui.queue-operations.desk_page.date_d_arrivee_zmki1y')}</dt>
                      <dd>
                        {passage.arrivedAt
                          ? dateFormatter.format(new Date(passage.arrivedAt))
                          : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt>{__t('ui.queue-operations.desk_page.arrivee_8ef051')}</dt>
                      <dd>
                        {passage.arrivedAt
                          ? timeFormatter.format(new Date(passage.arrivedAt))
                          : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt>{__t('ui.queue-operations.desk_page.appel_1i9dqud')}</dt>
                      <dd>{timeFormatter.format(new Date(passage.calledAt))}</dd>
                    </div>
                    <div>
                      <dt>{__t('ui.queue-operations.desk_page.sortie_1j61eqf')}</dt>
                      <dd>{timeFormatter.format(new Date(passage.closedAt))}</dd>
                    </div>
                  </dl>
                  <footer>
                    <small>
                      {__t(
                        'ui.queue-operations.desk_page.justificatif_de_passage_dori_document_non_fiscal_1knp9yu',
                      )}
                    </small>
                    <button
                      className="button print-hidden"
                      type="button"
                      disabled={!site.data?.data.siteName}
                      onClick={() => {
                        setPrintingPassageId(passage.registrationId);
                      }}
                    >
                      {__t('ui.queue-operations.desk_page.imprimer_le_justificatif_3rhfqy')}
                    </button>
                  </footer>
                  <div className="passage-print-legal" aria-hidden="true">
                    <p>
                      {__t(
                        'ui.queue-operations.desk_page.ce_justificatif_est_imprime_a_la_demande_du_clie_16a2ra6',
                      )}
                    </p>
                    <div>
                      <span>
                        {__t(
                          'ui.queue-operations.desk_page.signature_cachet_de_l_etablissement_5o6gtm',
                        )}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
      {printingPassage && site.data?.data.siteName ? (
        <PassagePrintDocument passage={printingPassage} siteName={site.data.data.siteName} />
      ) : null}
    </div>
  );
}
