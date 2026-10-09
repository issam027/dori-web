import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { queuesControllerFindAll, queuesControllerGetDisplay } from '@/api/generated/queues/queues';
import { useSessionStore } from '@/core/auth/session-store';
import { useScopeStore } from '@/core/scope/scope-store';
import { useBrandStore } from '@/core/theme/brand-store';
import { playChime, speakTicket } from './audio';

export function DisplayPage() {
  const { t: __t } = useTranslation();
  const user = useSessionStore((state) => state.user);
  const activeSiteId = useScopeStore((state) => state.activeSiteId);
  const brandName = useBrandStore((state) => state.name);
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
  const allowedQueues =
    queues.data?.data.items.filter(
      (queue) =>
        (user?.scope.isGlobal || user?.scope.queueIds.includes(queue.queueId)) &&
        (!(Number.isInteger(queryQueue) && queryQueue > 0) || queue.queueId === queryQueue),
    ) ?? [];
  const displays = useQueries({
    queries: allowedQueues.map((queue) => ({
      queryKey: ['display', 'snapshot', queue.queueId],
      queryFn: () => queuesControllerGetDisplay(queue.queueId),
      refetchInterval: 5000,
    })),
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
  const previousCall = useRef('');
  const current = activeCalls[0];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(new Date());
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);
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
        <h1>{__t('ui.public-experiences.display_page.aucune_file_configuree_1rf5ow7')}</h1>
        <p>
          {__t(
            'ui.public-experiences.display_page.ce_site_ne_dispose_actuellement_d_aucune_file_ac_ofrpsk',
          )}
        </p>
      </section>
    );
  if (!activeSiteId)
    return (
      <section className="display-screen display-empty-state">
        <h1>{__t('ui.public-experiences.display_page.aucun_site_actif_hmb19')}</h1>
        <p>
          {__t(
            'ui.public-experiences.display_page.selectionnez_un_site_pour_afficher_ses_files_15855xc',
          )}
        </p>
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
          <strong className="display-brand">
            {brandName || __t('ui.expression.public-experiences.display_page.dori_9y7skh')}
          </strong>
          <span>{__t('ui.public-experiences.display_page.accueil_et_orientation_bsalw')}</span>
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
            ? __t('ui.expression.public-experiences.display_page.son_active_sulxcn')
            : __t('ui.expression.public-experiences.display_page.activer_le_son_s79v3m')}
        </button>
      </header>
      <main className="display-board">
        <section className="display-active-zone" aria-live="assertive">
          <div className="display-section-heading">
            <div>
              <span>{__t('ui.public-experiences.display_page.en_direct_10riirr')}</span>
              <h2>{__t('ui.public-experiences.display_page.prises_en_charge_en_cours_1ycwyl7')}</h2>
            </div>
            <strong>{activeCalls.length}</strong>
          </div>
          {activeCalls.length ? (
            <div className="display-active-grid">
              {activeCalls.map((call, index) => (
                <article
                  className={`display-active-ticket${attention && index === 0 ? ' is-calling' : ''}`}
                  key={`${call.currentTicket ?? ''}-${String(call.queueId)}-${String(call.threadNumber)}`}
                >
                  <div className="display-ticket-number">
                    <small>{__t('ui.public-experiences.display_page.ticket_1nrpxxh')}</small>
                    <strong>{call.currentTicket}</strong>
                  </div>
                  <div className="display-destination">
                    <small>
                      {__t('ui.public-experiences.display_page.veuillez_rejoindre_bdsyjn')}
                    </small>
                    <b>
                      {__t('ui.public-experiences.display_page.guichet_15ztv8y')}
                      {call.threadNumber}
                    </b>
                    <span>
                      {call.queueName ??
                        __t('ui.expression.public-experiences.display_page.file_value0_jtr0pe', {
                          value0: String(call.queueId),
                        })}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="display-no-call">
              <strong>
                {__t('ui.public-experiences.display_page.nous_vous_appelons_bientot_1p9h8e5')}
              </strong>
              <p>
                {__t(
                  'ui.public-experiences.display_page.surveillez_votre_numero_dans_la_liste_des_procha_1ajw72y',
                )}
              </p>
            </div>
          )}
        </section>
        <aside className="display-next-zone">
          <div className="display-section-heading">
            <div>
              <span>{__t('ui.public-experiences.display_page.a_venir_1kyl18d')}</span>
              <h2>{__t('ui.public-experiences.display_page.prochains_tickets_130baxr')}</h2>
            </div>
          </div>
          {nextTickets.length ? (
            <ol>
              {nextTickets.slice(0, 8).map((item, index) => (
                <li key={`${item.ticket}-${String(item.queueId)}-${String(index)}`}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <strong>{item.ticket}</strong>
                    <small>
                      {item.queueName ??
                        __t('ui.expression.public-experiences.display_page.file_value0_jtr0pe', {
                          value0: String(item.queueId),
                        })}
                    </small>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="display-next-empty">
              {__t('ui.public-experiences.display_page.aucun_ticket_en_attente_1qqjurj')}
            </p>
          )}
        </aside>
      </main>
      <footer>
        {__t(
          'ui.public-experiences.display_page.merci_de_preparer_votre_ticket_et_de_rejoindre_l_8vcez6',
        )}
      </footer>
    </section>
  );
}
