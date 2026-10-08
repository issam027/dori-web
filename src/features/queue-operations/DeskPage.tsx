import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  queueEngineControllerCloseSession,
  queueEngineControllerGetActiveSessions,
  queueEngineControllerMarkNoShow,
  queueEngineControllerMarkServed,
  queueEngineControllerNextPreview,
  queueEngineControllerOpenSession,
} from '@/api/generated/queue-engine/queue-engine';
import { queuesControllerFindAll, queuesControllerGetStatus } from '@/api/generated/queues/queues';
import { registrationsControllerFindOne } from '@/api/generated/registrations/registrations';
import { useSessionStore } from '@/core/auth/session-store';
import { useScopeStore } from '@/core/scope/scope-store';
import { Card } from '@/design-system/components/Card';
import { EmptyState } from '@/design-system/components/FeedbackState';
import { PageHeader } from '@/design-system/components/PageHeader';
import { StatusBadge } from '@/design-system/components/StatusBadge';
import { canCallNext, useOperationStore } from './operation-store';
import { callNextAndCommit } from './operation-actions';
import { Receipt80mm } from './Receipt80mm';
import { QuickRegistration } from './QuickRegistration';
import { PersonNotesViewer } from '@/features/persons/PersonNotesViewer';

export function DeskPage() {
  const queryClient = useQueryClient();
  const user = useSessionStore((state) => state.user);
  const siteId = useScopeStore((state) => state.activeSiteId);
  const activeCall = useOperationStore((state) => state.activeCall);
  const recentCalls = useOperationStore((state) => state.recentCalls);
  const [pending, setPending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<{
    call: NonNullable<typeof activeCall>;
    outcome: 'served' | 'no_show';
  } | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const activeRegistration = useQuery({
    queryKey: ['registrations', activeCall?.registrationId],
    queryFn: () => registrationsControllerFindOne(activeCall?.registrationId ?? 0),
    enabled: activeCall !== null,
  });
  const queues = useQuery({
    queryKey: ['queues', siteId],
    queryFn: () =>
      queuesControllerFindAll({
        siteId: siteId ?? undefined,
        page: 1,
        pageSize: 100,
        isActive: true,
      }),
    enabled: siteId !== null,
  });
  const allowed =
    queues.data?.data.items.filter(
      (queue) => user?.scope.isGlobal || user?.scope.queueIds.includes(queue.queueId),
    ) ?? [];
  const previews = useQuery({
    queryKey: ['queue-preview', siteId],
    queryFn: () => queueEngineControllerNextPreview(siteId ?? 0, { limit: 5 }),
    enabled: siteId !== null,
    refetchInterval: 15000,
  });
  const sessions = useQueries({
    queries: allowed.map((queue) => ({
      queryKey: ['queue-sessions', queue.queueId],
      queryFn: () =>
        queueEngineControllerGetActiveSessions(queue.queueId, { page: 1, pageSize: 100 }),
    })),
  });
  const statuses = useQueries({
    queries: allowed.map((queue) => ({
      queryKey: ['queue-status', queue.queueId],
      queryFn: () => queuesControllerGetStatus(queue.queueId),
      refetchInterval: 15000,
    })),
  });
  const refresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['queues'] }),
        queryClient.invalidateQueries({ queryKey: ['queue-sessions'] }),
        queryClient.invalidateQueries({ queryKey: ['queue-status'] }),
        queryClient.invalidateQueries({ queryKey: ['queue-preview'] }),
        queryClient.invalidateQueries({ queryKey: ['registrations'] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  };
  const run = async (action: () => Promise<void>) => {
    setPending(true);
    setError('');
    try {
      await action();
    } catch (cause) {
      setError(
        (cause as { status?: number }).status === 409
          ? 'Conflit détecté : les données ont été actualisées.'
          : 'Action impossible.',
      );
      await refresh();
    } finally {
      setPending(false);
    }
  };
  const close = (outcome: 'served' | 'no_show') => {
    if (!activeCall) return;
    const call = activeCall;
    void run(async () => {
      if (outcome === 'served') await queueEngineControllerMarkServed(call.registrationId);
      else await queueEngineControllerMarkNoShow(call.registrationId);
      useOperationStore.getState().closeCall();
      setReceipt({ call, outcome });
      await refresh();
    });
  };
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Opérations"
        title="Cockpit guichet"
        description="Une session active est requise pour appeler le prochain client."
        actions={
          <button
            className="button"
            type="button"
            disabled={pending || refreshing}
            onClick={() => void refresh()}
          >
            <span className={refreshing ? 'refresh-icon is-spinning' : 'refresh-icon'}>↻</span>{' '}
            {refreshing ? 'Actualisation…' : 'Actualiser'}
          </button>
        }
      />
      {queues.isSuccess && allowed.length === 0 ? (
        <EmptyState
          title="Aucune file active"
          description="Aucune file n’est configurée ou active pour ce site."
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
        <Card>
          <h2>Prochains éligibles</h2>
          <div className="preview-list">
            {previews.data?.data.map((item) => (
              <span key={item.registrationId}>
                <strong>{item.ticketNumber}</strong> · {item.queueName} · {item.person.firstName}{' '}
                {item.person.lastName}
              </span>
            ))}
          </div>
        </Card>
      ) : null}
      {allowed.length > 0 ? (
        <Card>
          <h2>Prise en charge</h2>
          {activeCall ? (
            <div className="active-call">
              <strong>{activeCall.ticketNumber}</strong>
              <StatusBadge tone="accent">En cours</StatusBadge>
              <p>Guichet {activeCall.threadNumber}</p>
              {activeRegistration.data ? (
                <p>
                  Anciennete :{' '}
                  {Math.max(
                    0,
                    Math.floor(
                      (new Date(activeCall.calledAt).getTime() -
                        new Date(activeRegistration.data.data.createdAt).getTime()) /
                        60000,
                    ),
                  )}{' '}
                  min · SLA {activeRegistration.data.data.status}
                </p>
              ) : null}
              {activeRegistration.data ? (
                <button
                  className="button"
                  type="button"
                  onClick={() => {
                    setNotesOpen(true);
                  }}
                >
                  Consulter les notes
                </button>
              ) : null}
              <button
                className="button button-primary"
                disabled={pending}
                onClick={() => {
                  close('served');
                }}
              >
                Servi
              </button>
              <button
                className="button"
                disabled={pending}
                onClick={() => {
                  close('no_show');
                }}
              >
                Absent
              </button>
            </div>
          ) : (
            <p>Aucune personne en cours.</p>
          )}
          <h3>Quatre derniers appels</h3>
          <ol>
            {recentCalls.map((call) => (
              <li key={call.registrationId}>
                {call.ticketNumber} — guichet {call.threadNumber}
              </li>
            ))}
          </ol>
        </Card>
      ) : null}
      {allowed.length > 0 ? (
        <div className="queue-card-grid">
          {allowed.map((queue, index) => {
            const mine = sessions[index]?.data?.data.items.find(
              (session) => session.userId === user?.userId,
            );
            const occupied = sessions[index]?.data?.data.items.find(
              (session) => session.mode === 'active' && session.userId !== user?.userId,
            );
            const active = mine?.mode === 'active' && mine.threadNumber != null;
            return (
              <Card key={queue.queueId}>
                <h2>{queue.queueName}</h2>
                <p>
                  {statuses[index]?.data?.data.waitingCount ?? '—'} en attente · SLA estimé{' '}
                  {statuses[index]?.data?.data.estimatedWaitMinutes ?? '—'} min
                </p>
                {mine ? (
                  <>
                    <StatusBadge tone={active ? 'success' : 'neutral'}>
                      {active ? `Guichet ${String(mine.threadNumber)}` : 'Consultation'}
                    </StatusBadge>
                    <button
                      className="button"
                      disabled={pending || Boolean(activeCall)}
                      onClick={() => {
                        void run(async () => {
                          await queueEngineControllerCloseSession(queue.queueId, mine.sessionId);
                          await refresh();
                        });
                      }}
                    >
                      Libérer
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="button"
                      disabled={pending}
                      onClick={() => {
                        void run(async () => {
                          await queueEngineControllerOpenSession(queue.queueId, {
                            mode: 'consultation_only',
                          });
                          await refresh();
                        });
                      }}
                    >
                      Consulter
                    </button>
                    <button
                      className="button"
                      disabled={pending}
                      onClick={() => {
                        const takeOver =
                          Boolean(occupied) &&
                          window.confirm('Ce guichet est occupé. Confirmer la reprise ?');
                        if (occupied && !takeOver) return;
                        void run(async () => {
                          await queueEngineControllerOpenSession(queue.queueId, {
                            mode: 'active',
                            threadNumber: occupied?.threadNumber ?? 1,
                            takeOver,
                          });
                          await refresh();
                        });
                      }}
                    >
                      {occupied ? 'Reprendre le guichet' : 'Occuper le guichet'}
                    </button>
                  </>
                )}
                <button
                  className="button button-primary"
                  disabled={!canCallNext(active, activeCall, pending)}
                  onClick={() => {
                    void run(async () => {
                      await callNextAndCommit(queue.queueId);
                      await refresh();
                    });
                  }}
                >
                  Appeler le suivant
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
      {receipt ? <Receipt80mm call={receipt.call} outcome={receipt.outcome} /> : null}
    </div>
  );
}
