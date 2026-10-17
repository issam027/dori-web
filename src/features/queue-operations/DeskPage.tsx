import { useEffect, useState } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSessionStore } from '@/core/auth/session-store';
import { useScopeStore } from '@/core/scope/scope-store';
import { EmptyState } from '@/design-system/components/FeedbackState';
import { PageHeader } from '@/design-system/components/PageHeader';
import { FormField } from '@/design-system/components/FormField';
import { Modal } from '@/design-system/components/Modal';
import { notifyError } from '@/core/notifications/error-presentation';
import { notify } from '@/core/notifications/notification-store';
import { invalidateQueueOperations } from '@/api/client/query-invalidations';
import { queryKeys } from '@/api/client/query-keys';
import { registrationsControllerFindOne } from '@/api/generated/registrations/registrations';
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
} from './hooks/useQueueOperations';
import { EligiblePreviewCard, QueueDeskCard } from './components/DeskCards';
import { DeskPassages } from './components/DeskPassages';

export function DeskPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const user = useSessionStore((state) => state.user);
  const siteId = useScopeStore((state) => state.activeSiteId);
  const site = useSite(siteId);
  const activeCalls = useOperationStore((state) => state.activeCalls);
  const passages = useOperationStore((state) => state.passages);
  const [pendingQueueIds, setPendingQueueIds] = useState<ReadonlySet<number>>(new Set());
  const [error, setError] = useState('');
  const [notesPersonId, setNotesPersonId] = useState<number>();
  const [deskToOpen, setDeskToOpen] = useState<{
    queueId: number;
    queueName: string;
    occupiedThread?: number;
  }>();
  const [counterName, setCounterName] = useState('');
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
  const serverCurrents = threads.flatMap((query, index) =>
    (query.data?.data.items ?? [])
      .filter(
        (thread) =>
          thread.session?.userId === user?.userId && Boolean(thread.session?.currentRegistrationId),
      )
      .map((thread) => ({ queueId: allowed[index]?.queueId, thread })),
  );
  const serverRegistrations = useQueries({
    queries: serverCurrents.map(({ thread }) => ({
      queryKey: queryKeys.registrations.detail(thread.session?.currentRegistrationId),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        registrationsControllerFindOne(thread.session?.currentRegistrationId ?? 0, undefined, signal),
      enabled: Boolean(thread.session?.currentRegistrationId),
    })),
  });

  useEffect(() => {
    serverCurrents.forEach(({ queueId, thread }, index) => {
      if (!queueId || activeCalls[queueId] || !thread.session) return;
      const data = serverRegistrations[index]?.data?.data;
      if (!data || !['called', 'in_progress'].includes(data.status)) return;
      useOperationStore.getState().startCall(queueId, {
        registrationId: data.registrationId,
        ticketNumber: data.ticketNumber,
        entryType: data.entryType,
        scheduledTime: data.scheduledTime,
        calledEarly: false,
        tier: { tierId: data.tierId },
        status: data.status,
        sessionId: thread.session.sessionId,
        threadNumber: thread.threadNumber,
        priorityScore: 0,
        calledAt: data.updatedAt,
        person: { personId: data.personId },
      });
    });
  }, [activeCalls, serverCurrents, serverRegistrations]);

  const refresh = () => invalidateQueueOperations(queryClient);
  const execute = async (queueId: number, command: () => Promise<void>) => {
    setPendingQueueIds((current) => new Set(current).add(queueId));
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
      setPendingQueueIds((current) => {
        const next = new Set(current);
        next.delete(queueId);
        return next;
      });
    }
  };
  const finishCall = (
    queueId: number,
    outcome: 'served' | 'no_show',
    registration: Parameters<React.ComponentProps<typeof QueueDeskCard>['onFinishCall']>[1],
    personName: string,
  ) => {
    const call = activeCalls[queueId];
    if (!call) return;
    void execute(queueId, async () => {
      if (outcome === 'served') await markServed.execute(call.registrationId);
      else await markNoShow.execute(call.registrationId);
      useOperationStore.getState().closeCall(queueId);
      useOperationStore.getState().addPassage({
        registrationId: call.registrationId,
        ticketNumber: call.ticketNumber,
        personName: personName || t('queue-operations.desk.personneNonRenseignee'),
        firstName: registration?.firstName,
        lastName: registration?.lastName,
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
    void execute(queueId, async () => {
      await closeSession.execute({ queueId, sessionId });
      notify({ tone: 'success', title: t('notifications.desk.released'), message: queueName });
      await refresh();
    });
  const occupyDesk = (
    queueId: number,
    queueName: string,
    counterNameValue: string,
    occupiedThread?: number,
  ) => {
    const takeOver =
      occupiedThread !== undefined &&
      window.confirm(t('queue-operations.desk.ceGuichetEstOccupeConfirmerLaReprise'));
    if (occupiedThread !== undefined && !takeOver) return;
    void execute(queueId, async () => {
      await openSession.execute({
        queueId,
        dto: {
          mode: 'active',
          counterName: counterNameValue.trim(),
          threadNumber: occupiedThread ?? 1,
          takeOver,
        },
      });
      notify({
        tone: 'success',
        title: takeOver ? t('notifications.desk.takenOver') : t('notifications.desk.opened'),
        message: queueName,
      });
      setDeskToOpen(undefined);
      setCounterName('');
      await refresh();
    });
  };
  const callFromQueue = (queueId: number, queueName: string) =>
    void execute(queueId, async () => {
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
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={t('nav.operations')}
        title={t('queue-operations.desk.cockpitGuichet')}
        description={
          deskSessionsLoading
            ? undefined
            : hasActiveDeskSession
              ? t('desk.activeSessionDescription')
              : t('desk.sessionRequired')
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
                pending={pendingQueueIds.has(queue.queueId)}
                activeCall={activeCalls[queue.queueId]}
                onRelease={() => {
                  if (mine) releaseDesk(queue.queueId, mine.sessionId, queue.queueName);
                }}
                onOccupy={() => {
                  setCounterName(occupied?.counterName ?? '');
                  setDeskToOpen({
                    queueId: queue.queueId,
                    queueName: queue.queueName,
                    occupiedThread: occupied?.threadNumber ?? undefined,
                  });
                }}
                onCallNext={() => {
                  callFromQueue(queue.queueId, queue.queueName);
                }}
                onFinishCall={(outcome, registration, personName) => {
                  finishCall(queue.queueId, outcome, registration, personName);
                }}
                onNotes={setNotesPersonId}
              />
            );
          })}
        </div>
      ) : null}
      {notesPersonId ? (
        <PersonNotesViewer
          personId={notesPersonId}
          open
          onOpenChange={(open) => {
            if (!open) setNotesPersonId(undefined);
          }}
        />
      ) : null}
      <DeskPassages passages={passages} siteName={site.data?.data.siteName} />
      <Modal
        open={Boolean(deskToOpen)}
        onOpenChange={(open) => {
          if (!open && !pendingQueueIds.size) {
            setDeskToOpen(undefined);
            setCounterName('');
          }
        }}
        title={t('desk.openCounterTitle')}
        description={deskToOpen?.queueName}
        actions={
          <button
            className="button button-primary"
            type="button"
            disabled={Boolean(pendingQueueIds.size) || !counterName.trim()}
            onClick={() => {
              if (!deskToOpen) return;
              occupyDesk(
                deskToOpen.queueId,
                deskToOpen.queueName,
                counterName,
                deskToOpen.occupiedThread,
              );
            }}
          >
            {t('desk.openCounterAction')}
          </button>
        }
      >
        <FormField label={t('desk.counterName')} hint={t('desk.counterNameHint')} required>
          <input
            autoFocus
            maxLength={100}
            value={counterName}
            placeholder={t('desk.counterNamePlaceholder')}
            onChange={(event) => {
              setCounterName(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && counterName.trim() && deskToOpen && !pendingQueueIds.size) {
                event.preventDefault();
                occupyDesk(
                  deskToOpen.queueId,
                  deskToOpen.queueName,
                  counterName,
                  deskToOpen.occupiedThread,
                );
              }
            }}
          />
        </FormField>
      </Modal>
    </div>
  );
}
