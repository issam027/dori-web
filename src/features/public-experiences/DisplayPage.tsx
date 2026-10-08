import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { QueueDisplayResponseDto } from '@/api/generated/models';
import { queuesControllerFindAll, queuesControllerGetDisplay } from '@/api/generated/queues/queues';
import { useSessionStore } from '@/core/auth/session-store';
import { useScopeStore } from '@/core/scope/scope-store';
import { PollingRealtimeGateway } from '@/core/realtime/realtime-gateway';
import { playChime, speakTicket } from './audio';
import { isPublicDisplaySnapshot } from './privacy';

export function DisplayPage() {
  const user = useSessionStore((state) => state.user);
  const activeSiteId = useScopeStore((state) => state.activeSiteId);
  const activeQueueId = useScopeStore((state) => state.activeQueueId);
  const queryQueue = Number(new URLSearchParams(location.search).get('queueId'));
  const queues = useQuery({
    queryKey: ['display', 'queues', activeSiteId],
    enabled: Boolean(activeSiteId),
    queryFn: () =>
      queuesControllerFindAll({
        siteId: activeSiteId ?? undefined,
        isActive: true,
        page: 1,
        pageSize: 100,
      }),
  });
  const queueId =
    Number.isInteger(queryQueue) && queryQueue > 0
      ? queryQueue
      : (activeQueueId ?? queues.data?.data.items[0]?.queueId ?? user?.scope.queueIds[0]);
  const [snapshot, setSnapshot] = useState<QueueDisplayResponseDto>();
  const [audio, setAudio] = useState(false);
  const [attention, setAttention] = useState(false);
  const [clock, setClock] = useState(new Date());
  const previousCall = useRef('');
  const gateway = useMemo(
    () =>
      queueId
        ? new PollingRealtimeGateway(
            async () => (await queuesControllerGetDisplay(queueId)).data,
            5000,
          )
        : null,
    [queueId],
  );
  useEffect(() => {
    if (!gateway) return;
    const unsubscribe = gateway.subscribe((next) => {
      if (isPublicDisplaySnapshot(next)) setSnapshot(next);
    });
    void gateway.connect();
    return () => {
      unsubscribe();
      gateway.disconnect();
    };
  }, [gateway]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(new Date());
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);
  const current =
    snapshot?.activeThreads.find((item) => item.currentTicket) ?? snapshot?.activeThreads[0];
  useEffect(() => {
    const key = current?.currentTicket
      ? `${current.currentTicket}:${String(current.threadNumber)}`
      : '';
    if (!key || key === previousCall.current) return;
    previousCall.current = key;
    setAttention(true);
    const timer = window.setTimeout(() => {
      setAttention(false);
    }, 10_000);
    if (audio) {
      playChime();
      speakTicket(
        current?.currentTicket ?? '',
        current?.threadNumber ?? 0,
        document.documentElement.lang || 'fr',
      );
    }
    return () => {
      window.clearTimeout(timer);
    };
  }, [audio, current]);
  if (!queues.isPending && activeSiteId && queues.data?.data.items.length === 0)
    return (
      <section className="display-screen display-empty-state">
        <h1>Aucune file configurée</h1>
        <p>Ce site ne dispose actuellement d’aucune file active.</p>
      </section>
    );
  if (!queueId)
    return (
      <section className="display-screen display-empty-state">
        <h1>Aucun site actif</h1>
        <p>Sélectionnez un site pour afficher ses files.</p>
      </section>
    );
  return (
    <section className="display-screen">
      <header>
        <div>
          <span>File d’attente</span>
          <h1>{snapshot?.queueName ?? `File ${String(queueId)}`}</h1>
        </div>
        <time>{clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
        <button
          type="button"
          className="display-audio"
          aria-pressed={audio}
          onClick={() => {
            setAudio((value) => !value);
          }}
        >
          {audio ? 'Son activé' : 'Activer le son'}
        </button>
      </header>
      <div className={attention ? 'display-call is-calling' : 'display-call'} aria-live="assertive">
        <span>Ticket appelé</span>
        <strong>{current?.currentTicket ?? '—'}</strong>
        <p>Guichet {current?.threadNumber ?? '—'}</p>
      </div>
      <aside>
        <h2>Prochains tickets</h2>
        <ol>
          {snapshot?.nextTickets.slice(0, 4).map((ticket) => (
            <li key={ticket}>{ticket}</li>
          ))}
        </ol>
      </aside>
      <footer>Merci de préparer votre ticket et de rejoindre le guichet indiqué.</footer>
    </section>
  );
}
