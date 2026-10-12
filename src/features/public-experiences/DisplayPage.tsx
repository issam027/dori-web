import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';
import { useSessionStore } from '@/core/auth/session-store';
import { useScopeStore } from '@/core/scope/scope-store';
import { useBrandStore } from '@/core/theme/brand-store';
import { playChime, speakTicket } from './audio';
import { useDisplaySnapshot } from './hooks/usePublicExperiences';

export function DisplayPage() {
  const { t: __t } = useTranslation();
  const user = useSessionStore((state) => state.user);
  const activeSiteId = useScopeStore((state) => state.activeSiteId);
  const brandName = useBrandStore((state) => state.name);
  const queryQueue = Number(new URLSearchParams(location.search).get('queueId'));
  const { queues, allowedQueues, displays } = useDisplaySnapshot({
    siteId: activeSiteId,
    allowedQueueIds: user?.scope.queueIds ?? [],
    isGlobal: user?.scope.isGlobal ?? false,
    selectedQueueId: Number.isInteger(queryQueue) && queryQueue > 0 ? queryQueue : undefined,
  });
  const snapshots = displays.flatMap((query) => (query.data ? [query.data.data] : []));
  const activeCalls = snapshots
    .flatMap((snapshot) =>
      snapshot.activeThreads
        .filter((thread) => thread.currentTicket)
        .map((thread) => ({ ...thread, queueId: snapshot.queueId, queueName: snapshot.queueName })),
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
  const activePageCount = Math.max(1, Math.ceil(activeCalls.length / 4));
  const nextPageCount = Math.max(1, Math.ceil(nextTickets.length / 5));
  const currentActivePage = activePage % activePageCount;
  const currentNextPage = nextPage % nextPageCount;
  const visibleActiveCalls = activeCalls.slice(currentActivePage * 4, currentActivePage * 4 + 4);
  const visibleNextTickets = nextTickets.slice(currentNextPage * 5, currentNextPage * 5 + 5);

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
      ? `${current.currentTicket}:${String(current.threadNumber)}:${String(current.queueId)}`
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
      : `${String(allowedQueues.length)} files`;

  return (
    <section className="display-screen">
      <header>
        <div>
          <strong className="display-brand">{brandName || __t('app.name')}</strong>
          <span>{__t('public-experiences.display.accueilEtOrientationBsalw')}</span>
          <h1>{scopeTitle}</h1>
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
          {audio
            ? __t('public-experiences.display.sonActive')
            : __t('public-experiences.display.activerLeSon')}
        </button>
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
                  key={`${call.currentTicket ?? ''}-${String(call.queueId)}-${String(call.threadNumber)}`}
                >
                  <div className="display-ticket-number">
                    <small>{__t('common.ticket')}</small>
                    <strong>{call.currentTicket}</strong>
                  </div>
                  <div className="display-destination">
                    <small>{__t('public-experiences.display.veuillezRejoindre')}</small>
                    <b>
                      {__t('common.guichet')} {call.threadNumber}
                    </b>
                    <span>
                      {call.queueName ??
                        __t('display.queueName', {
                          value0: String(call.queueId),
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
                <li key={`${item.ticket}-${String(item.queueId)}-${String(index)}`}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <strong>{item.ticket}</strong>
                    <small>
                      {item.queueName ??
                        __t('display.queueName', {
                          value0: String(item.queueId),
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
