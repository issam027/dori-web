import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSessionStore } from '@/core/auth/session-store';
import { getAccessToken } from '@/core/auth/access-token';
import { useScopeStore } from '@/core/scope/scope-store';
import { useBrandStore } from '@/core/theme/brand-store';
import { useQueueDisplayRealtime } from '@/core/realtime/use-queue-realtime';
import { queryKeys } from '@/api/client/query-keys';
import { playChime, speakTicket } from './audio';
import { useDisplaySnapshot } from './hooks/usePublicExperiences';
import { Button } from '@/design-system/components/Button';

const activeTicketsPerPage = 6;
const upcomingTicketsPerPage = 8;

export function DisplayPage() {
  const { t: __t } = useTranslation();
  const queryClient = useQueryClient();
  const user = useSessionStore((state) => state.user);
  const activeSiteId = useScopeStore((state) => state.activeSiteId);
  const brandName = useBrandStore((state) => state.name);
  const queryQueue = new URLSearchParams(location.search).get('queueId');
  const { queues, allowedQueues, displays, sessions } = useDisplaySnapshot({
    siteId: activeSiteId,
    allowedQueueIds: user?.scope.queueIds ?? [],
    isGlobal: user?.scope.isGlobal ?? false,
    selectedQueueId: queryQueue || undefined,
  });
  const displayedQueueIds = allowedQueues.map((queue) => queue.queueId);
  const refreshQueues = (queueIds: readonly string[]) => {
    queueIds.forEach((queueId) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.publicExperience.displaySnapshot(queueId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.queueSessions.byQueue(queueId) });
    });
  };
  useQueueDisplayRealtime({
    queueIds: displayedQueueIds,
    getToken: getAccessToken,
    onEvent: (event) => {
      refreshQueues(
        event.queueId && displayedQueueIds.includes(event.queueId)
          ? [event.queueId]
          : displayedQueueIds,
      );
    },
    onReconnect: (queueId) => {
      refreshQueues([queueId]);
    },
  });
  const snapshots = displays.flatMap((query) => (query.data ? [query.data.data] : []));
  const counterNames = new Map(
    sessions.flatMap((query, index) =>
      (query.data?.data.items ?? []).map(
        (session) =>
          [
            `${allowedQueues[index]?.queueId ?? 'unknown'}:${String(session.threadNumber)}`,
            session.counterName?.trim() || undefined,
          ] as const,
      ),
    ),
  );
  const activeCalls = snapshots
    .flatMap((snapshot) =>
      snapshot.activeThreads
        .filter((thread) => thread.currentTicket)
        .map((thread) => ({
          ...thread,
          queueId: snapshot.queueId,
          queueName: snapshot.queueName,
          counterName: counterNames.get(`${snapshot.queueId}:${String(thread.threadNumber)}`),
        })),
    )
    .sort(
      (left, right) =>
        new Date(right.calledAt ?? 0).getTime() - new Date(left.calledAt ?? 0).getTime(),
    );
  const nextTickets = snapshots.flatMap((snapshot) =>
    snapshot.nextTickets.map((ticket) => ({
      ticket,
      queueId: snapshot.queueId,
      queueName: snapshot.queueName,
    })),
  );
  const [audio, setAudio] = useState(false);
  const [attention, setAttention] = useState(false);
  const [clock, setClock] = useState(new Date());
  const [activePage, setActivePage] = useState(0);
  const [nextPage, setNextPage] = useState(0);
  const previousCall = useRef('');
  const current = activeCalls[0];
  const activePageCount = Math.max(1, Math.ceil(activeCalls.length / activeTicketsPerPage));
  const nextPageCount = Math.max(1, Math.ceil(nextTickets.length / upcomingTicketsPerPage));
  const currentActivePage = activePage % activePageCount;
  const currentNextPage = nextPage % nextPageCount;
  const visibleActiveCalls = activeCalls.slice(
    currentActivePage * activeTicketsPerPage,
    currentActivePage * activeTicketsPerPage + activeTicketsPerPage,
  );
  const visibleNextTickets = nextTickets.slice(
    currentNextPage * upcomingTicketsPerPage,
    currentNextPage * upcomingTicketsPerPage + upcomingTicketsPerPage,
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(new Date());
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    if (activePageCount === 1 && nextPageCount === 1) return;
    const timer = window.setInterval(() => {
      setActivePage((page) => (page + 1) % activePageCount);
      setNextPage((page) => (page + 1) % nextPageCount);
    }, 8_000);
    return () => {
      window.clearInterval(timer);
    };
  }, [activePageCount, nextPageCount]);
  useEffect(() => {
    const key = current?.currentTicket
      ? `${current.currentTicket}:${String(current.threadNumber)}:${current.counterName ?? ''}:${current.queueId}`
      : '';
    if (!key || key === previousCall.current) return;
    previousCall.current = key;
    setActivePage(0);
    setAttention(true);
    const timer = window.setTimeout(() => {
      setAttention(false);
    }, 10_000);
    if (audio) {
      playChime();
      speakTicket(
        current?.currentTicket ?? '',
        current?.counterName || `${__t('common.guichet')} ${String(current?.threadNumber ?? 0)}`,
        document.documentElement.lang || 'fr',
      );
    }
    return () => {
      window.clearTimeout(timer);
    };
  }, [__t, audio, current]);

  if (!queues.isPending && activeSiteId && allowedQueues.length === 0)
    return (
      <section className="display-screen display-empty-state">
        <h1>{__t('common.aucuneFileConfiguree')}</h1>
        <p>{__t('public-experiences.display.ceSiteNeDisposeActuellementDAucuneFileAc')}</p>
      </section>
    );
  if (!activeSiteId)
    return (
      <section className="display-screen display-empty-state">
        <h1>{__t('common.noActiveSite')}</h1>
        <p>{__t('public-experiences.display.selectionnezUnSitePourAfficherSesFiles')}</p>
      </section>
    );

  const scopeTitle =
    allowedQueues.length === 1
      ? allowedQueues[0]?.queueName
      : __t('public-experiences.display.filesAffichees', {
          count: allowedQueues.length,
        });
  const displayBrandName =
    !brandName || brandName.trim().toUpperCase() === 'DORIFY' ? __t('app.name') : brandName;

  return (
    <section className="display-screen">
      <header>
        <div>
          <strong className="display-brand">{displayBrandName}</strong>
          <span>{__t('public-experiences.display.accueilEtOrientationBsalw')}</span>
          <h1>{scopeTitle}</h1>
        </div>
        <time>{clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
        <Button
          variant="unstyled"
          type="button"
          className="display-audio"
          aria-pressed={audio}
          onClick={() => {
            setAudio((value) => !value);
          }}
        >
          {audio
            ? __t('public-experiences.display.sonActive')
            : __t('public-experiences.display.activerLeSon')}
        </Button>
      </header>
      <main className="display-board">
        <section className="display-active-zone" aria-live="assertive">
          <div className="display-section-heading">
            <div>
              <span>{__t('common.enDirect')}</span>
              <h2>{__t('public-experiences.display.prisesEnChargeEnCours')}</h2>
            </div>
            <div className="display-section-count">
              <strong>{activeCalls.length}</strong>
              {activePageCount > 1 ? (
                <small>
                  {currentActivePage + 1}/{activePageCount}
                </small>
              ) : null}
            </div>
          </div>
          {activeCalls.length ? (
            <div className="display-active-grid" key={`active-${String(currentActivePage)}`}>
              {visibleActiveCalls.map((call) => (
                <article
                  className={`display-active-ticket${attention && call.currentTicket === current?.currentTicket ? ' is-calling' : ''}`}
                  key={`${call.currentTicket ?? ''}-${call.queueId}-${String(call.threadNumber)}`}
                >
                  <div className="display-ticket-number">
                    <small>{__t('common.ticket')}</small>
                    <strong>{call.currentTicket}</strong>
                  </div>
                  <div className="display-destination">
                    <small>{__t('public-experiences.display.veuillezRejoindre')}</small>
                    <b>
                      {call.counterName || `${__t('common.guichet')} ${String(call.threadNumber)}`}
                    </b>
                    <span>
                      {call.queueName ??
                        __t('display.queueName', {
                          value0: call.queueId,
                        })}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="display-no-call">
              <strong>{__t('public-experiences.display.nousVousAppelonsBientot')}</strong>
              <p>{__t('public-experiences.display.surveillezVotreNumeroDansLaListeDesProcha')}</p>
            </div>
          )}
        </section>
        <aside className="display-next-zone">
          <div className="display-section-heading">
            <div>
              <span>{__t('public-experiences.display.aVenir')}</span>
              <h2>{__t('public-experiences.display.prochainsTickets')}</h2>
            </div>
            {nextPageCount > 1 ? (
              <small className="display-page-indicator">
                {currentNextPage + 1}/{nextPageCount}
              </small>
            ) : null}
          </div>
          {nextTickets.length ? (
            <ol key={`next-${String(currentNextPage)}`}>
              {visibleNextTickets.map((item, index) => (
                <li key={`${item.ticket}-${item.queueId}-${String(index)}`}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <strong>{item.ticket}</strong>
                    <small>
                      {item.queueName ??
                        __t('display.queueName', {
                          value0: item.queueId,
                        })}
                    </small>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="display-next-empty">
              {__t('public-experiences.display.aucunTicketEnAttente')}
            </p>
          )}
        </aside>
      </main>
      <footer>{__t('public-experiences.display.merciDePreparerVotreTicketEtDeRejoindreL')}</footer>
    </section>
  );
}
