import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSessionStore } from '@/core/auth/session-store';
import { useScopeStore } from '@/core/scope/scope-store';
import { EmptyState } from '@/design-system/components/FeedbackState';
import { PageHeader } from '@/design-system/components/PageHeader';
import { notifyError } from '@/core/notifications/error-presentation';
import { notify } from '@/core/notifications/notification-store';
import { invalidateQueueOperations } from '@/api/client/query-invalidations';
import { usePerson, usePersonNotes } from '@/features/persons/hooks/usePersons';
import { PersonNotesViewer } from '@/features/persons/PersonNotesViewer';
import { useSite } from '@/features/portfolio/hooks/useSites';
import { useQueues, useQueueStatuses } from '@/features/queues/hooks/useQueues';
import { QuickRegistration } from './QuickRegistration';
import { useOperationStore } from './operation-store';
import {
  useCallNext,
  useCloseDeskSession,
  useDeskSession,
  useMarkNoShow,
  useMarkServed,
  useOpenDeskSession,
  useRegistration,
} from './hooks/useQueueOperations';
import { ActiveCallCard, EligiblePreviewCard, QueueDeskCard } from './components/DeskCards';
import { DeskPassages } from './components/DeskPassages';

export function DeskPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const user = useSessionStore((state) => state.user);
  const siteId = useScopeStore((state) => state.activeSiteId);
  const site = useSite(siteId);
  const activeCall = useOperationStore((state) => state.activeCall);
  const passages = useOperationStore((state) => state.passages);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notesOpen, setNotesOpen] = useState(false);
  const queues = useQueues({ siteId, isActive: true });
  const allowed =
    queues.data?.data.items.filter(
      (queue) => user?.scope.isGlobal || user?.scope.queueIds.includes(queue.queueId),
    ) ?? [];
  const { previews, sessions, threads } = useDeskSession(
    siteId,
    allowed.map((queue) => queue.queueId),
  );
  const statuses = useQueueStatuses(allowed.map((queue) => queue.queueId));
  const activeRegistration = useRegistration(activeCall?.registrationId, activeCall !== null);
  const activePersonId = activeRegistration.data?.data.personId;
  const activePerson = usePerson(activePersonId);
  const activePersonNotes = usePersonNotes(activePersonId ?? 0, {
    enabled: Boolean(activePersonId),
    pageSize: 1,
    usage: 'count',
  });
  const callNext = useCallNext();
  const markServed = useMarkServed();
  const markNoShow = useMarkNoShow();
  const openSession = useOpenDeskSession();
  const closeSession = useCloseDeskSession();
  const deskSessionsLoading = sessions.some((session) => session.isPending);
  const hasActiveDeskSession = sessions.some((session) =>
    session.data?.data.items.some(
      (item) => item.userId === user?.userId && item.mode === 'active' && item.threadNumber != null,
    ),
  );
  const rankedQueues = allowed
    .map((queue, index) => ({ queue, index }))
    .sort((left, right) => {
      const active = (index: number) =>
        sessions[index]?.data?.data.items.some((session) => session.mode === 'active') ?? false;
      return Number(active(right.index)) - Number(active(left.index));
    });
  const serverCurrent = threads
    .flatMap((query) => query.data?.data.items ?? [])
    .find(
      (thread) =>
        thread.session?.userId === user?.userId && Boolean(thread.session?.currentRegistrationId),
    );
  const serverRegistrationId = serverCurrent?.session?.currentRegistrationId ?? null;
  const serverRegistration = useRegistration(serverRegistrationId);

  useEffect(() => {
    if (
      activeCall ||
      !serverCurrent ||
      !serverRegistrationId ||
      passages.some((item) => item.registrationId === serverRegistrationId)
    )
      return;
    const data = serverRegistration.data?.data;
    if (!data || !['called', 'in_progress'].includes(data.status) || !serverCurrent.session) return;
    useOperationStore.getState().startCall({
      registrationId: data.registrationId,
      ticketNumber: data.ticketNumber,
      entryType: data.entryType,
      scheduledTime: data.scheduledTime,
      calledEarly: false,
      tier: { tierId: data.tierId },
      status: data.status,
      sessionId: serverCurrent.session.sessionId,
      threadNumber: serverCurrent.threadNumber,
      priorityScore: 0,
      calledAt: data.updatedAt,
      person: { personId: data.personId },
    });
  }, [activeCall, passages, serverCurrent, serverRegistration.data, serverRegistrationId]);

  const refresh = () => invalidateQueueOperations(queryClient);
  const execute = async (command: () => Promise<void>) => {
    setPending(true);
    setError('');
    try {
      await command();
    } catch (cause) {
      notifyError(cause);
      setError(
        (cause as { status?: number }).status === 409
          ? t('states.conflict')
          : t('errors.actionImpossible'),
      );
      await refresh();
    } finally {
      setPending(false);
    }
  };
  const finishCall = (outcome: 'served' | 'no_show') => {
    if (!activeCall) return;
    const call = activeCall;
    const registration = activeRegistration.data?.data;
    const personName = [activePerson.data?.data.firstName, activePerson.data?.data.lastName]
      .filter((part): part is string => Boolean(part?.trim()))
      .join(' ');
    void execute(async () => {
      if (outcome === 'served') await markServed.execute(call.registrationId);
      else await markNoShow.execute(call.registrationId);
      useOperationStore.getState().closeCall();
      useOperationStore.getState().addPassage({
        registrationId: call.registrationId,
        ticketNumber: call.ticketNumber,
        personName: personName || t('queue-operations.desk.personneNonRenseignee'),
        firstName: activePerson.data?.data.firstName ?? undefined,
        lastName: activePerson.data?.data.lastName ?? undefined,
        arrivedAt: registration?.createdAt,
        calledAt: call.calledAt,
        closedAt: new Date().toISOString(),
        threadNumber: call.threadNumber,
        outcome,
      });
      notify({
        tone: 'success',
        title:
          outcome === 'served' ? t('notifications.visit.served') : t('notifications.visit.noShow'),
        message: t('notifications.visit.closedMessage', { ticket: call.ticketNumber }),
      });
      await refresh();
    });
  };
  const releaseDesk = (queueId: number, sessionId: number, queueName: string) =>
    void execute(async () => {
      await closeSession.execute({ queueId, sessionId });
      notify({ tone: 'success', title: t('notifications.desk.released'), message: queueName });
      await refresh();
    });
  const occupyDesk = (queueId: number, queueName: string, occupiedThread?: number) => {
    const takeOver =
      occupiedThread !== undefined &&
      window.confirm(t('queue-operations.desk.ceGuichetEstOccupeConfirmerLaReprise'));
    if (occupiedThread !== undefined && !takeOver) return;
    void execute(async () => {
      await openSession.execute({
        queueId,
        dto: { mode: 'active', threadNumber: occupiedThread ?? 1, takeOver },
      });
      notify({
        tone: 'success',
        title: takeOver ? t('notifications.desk.takenOver') : t('notifications.desk.opened'),
        message: queueName,
      });
      await refresh();
    });
  };
  const callFromQueue = (queueId: number, queueName: string) =>
    void execute(async () => {
      const outcome = await callNext.execute(queueId);
      notify(
        outcome === 'empty'
          ? {
              tone: 'info',
              title: t('notifications.queue.empty'),
              message: t('notifications.queue.emptyMessage', { queue: queueName }),
            }
          : { tone: 'success', title: t('notifications.visit.called'), message: queueName },
      );
      await refresh();
    });
  const personName = [activePerson.data?.data.firstName, activePerson.data?.data.lastName]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(' ');

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Opérations"
        title={t('queue-operations.desk.cockpitGuichet')}
        description={
          deskSessionsLoading
            ? undefined
            : hasActiveDeskSession
              ? t('desk.activeSessionDescription')
              : t('queue-operations.desk.uneSessionActiveEstRequisePourAppelerLeP3hwh4')
        }
      />
      {queues.isSuccess && allowed.length === 0 ? (
        <EmptyState
          title={t('queue-operations.desk.aucuneFileActive')}
          description={t('queue-operations.desk.aucuneFileNEstConfigureeOuActivePourCeS')}
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
          <EligiblePreviewCard items={previews.data?.data ?? []} />
          <ActiveCallCard
            call={activeCall}
            registration={activeRegistration.data?.data}
            personName={personName}
            noteCount={activePersonNotes.data?.data.total ?? 0}
            pending={pending}
            onServed={() => {
              finishCall('served');
            }}
            onNoShow={() => {
              finishCall('no_show');
            }}
            onNotes={
              activePersonId
                ? () => {
                    setNotesOpen(true);
                  }
                : undefined
            }
          />
          {rankedQueues.map(({ queue, index }) => {
            const mine = sessions[index]?.data?.data.items.find(
              (item) => item.userId === user?.userId,
            );
            const occupied = sessions[index]?.data?.data.items.find(
              (item) => item.mode === 'active' && item.userId !== user?.userId,
            );
            const active = mine?.mode === 'active' && mine.threadNumber != null;
            return (
              <QueueDeskCard
                key={queue.queueId}
                queue={queue}
                session={mine}
                occupied={occupied}
                active={active}
                waitingCount={statuses[index]?.data?.data.waitingCount}
                estimatedWaitMinutes={statuses[index]?.data?.data.estimatedWaitMinutes}
                pending={pending}
                hasActiveCall={Boolean(activeCall)}
                onRelease={() => {
                  if (mine) releaseDesk(queue.queueId, mine.sessionId, queue.queueName);
                }}
                onOccupy={() => {
                  occupyDesk(queue.queueId, queue.queueName, occupied?.threadNumber ?? undefined);
                }}
                onCallNext={() => {
                  callFromQueue(queue.queueId, queue.queueName);
                }}
              />
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
      <DeskPassages passages={passages} siteName={site.data?.data.siteName} />
    </div>
  );
}
