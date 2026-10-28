import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  BellRing,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock3,
  DoorOpen,
  History,
  LayoutGrid,
  Lightbulb,
  MonitorUp,
  PhoneCall,
  RefreshCw,
  Search,
  Star,
  TriangleAlert,
  Users,
  UserX,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type {
  CockpitQueueItemDto,
  QueueEngineControllerGetCockpit200,
} from '@/api/generated/models';
import { queryKeys } from '@/api/client/query-keys';
import { getAccessToken } from '@/core/auth/access-token';
import { formatDateTime } from '@/core/i18n/date-format';
import { notifyError } from '@/core/notifications/error-presentation';
import { notify } from '@/core/notifications/notification-store';
import { RealtimeConnectionIndicator } from '@/core/realtime/RealtimeConnectionIndicator';
import { useDegradedRealtimeRefresh } from '@/core/realtime/use-degraded-realtime-refresh';
import { useQueueDisplayRealtime } from '@/core/realtime/use-queue-realtime';
import { useScopeStore } from '@/core/scope/scope-store';
import { Button } from '@/design-system/components/Button';
import { Card, MetricCard } from '@/design-system/components/Card';
import { EmptyState, ErrorState } from '@/design-system/components/FeedbackState';
import { FormField } from '@/design-system/components/FormField';
import { ConfirmDialog, Modal } from '@/design-system/components/Modal';
import { PageHeader } from '@/design-system/components/PageHeader';
import { StatusBadge } from '@/design-system/components/StatusBadge';
import { PersonNotesViewer } from '@/features/notes/public';
import { useSite } from '@/features/portfolio/public';
import { RegistrationDetailsModal } from '@/features/queue-operations/public';
import { QuickRegistration } from './QuickRegistration';
import { playCockpitTone } from './cockpit-feedback';
import { CockpitPassagePrintButton } from './components/CockpitPassagePrintButton';
import {
  mergeCockpitQueue,
  refreshCockpitQueue,
  shouldSkipCockpitRealtimeRefresh,
  useCockpit,
  useCockpitActions,
} from './hooks/useCockpit';
import { useCockpitPreferences, type CockpitSort } from './hooks/useCockpitPreferences';
import { broadcastCockpitRefresh, useCockpitCrossTab } from './hooks/useCockpitCrossTab';
import { elapsedMinutes, useServerClock } from './hooks/useServerClock';

type SessionDialogState = { queue: CockpitQueueItemDto } | null;
type NotesDialogState = {
  personId: string;
  personName: string;
  queueId: string;
  mode: 'view' | 'add';
} | null;
type RegistrationDetailsDialogState = {
  registrationId: string;
  queueName: string;
} | null;
type ConfirmationState = {
  title: string;
  description: string;
  label: string;
  destructive?: boolean;
  action: () => void;
} | null;

function asDate(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function personName(person: { firstName: string | null; lastName: string | null }) {
  return [person.firstName, person.lastName].filter(Boolean).join(' ');
}

export function CockpitPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const siteId = useScopeStore((state) => state.activeSiteId);
  const cockpit = useCockpit(siteId);
  const site = useSite(siteId);
  const actions = useCockpitActions(siteId);
  const [sessionDialog, setSessionDialog] = useState<SessionDialogState>(null);
  const [selectedThread, setSelectedThread] = useState<number>();
  const [replaceSessionId, setReplaceSessionId] = useState<string>();
  const [counterName, setCounterName] = useState('');
  const [notesDialog, setNotesDialog] = useState<NotesDialogState>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationState>(null);
  const [historyOutcome, setHistoryOutcome] = useState<'all' | 'served' | 'no_show'>('all');
  const [historyQueueId, setHistoryQueueId] = useState('all');
  const [historySearch, setHistorySearch] = useState('');
  const [queueSearch, setQueueSearch] = useState('');
  const [registrationDetailsDialog, setRegistrationDetailsDialog] =
    useState<RegistrationDetailsDialogState>(null);
  const realtimeRefreshTimers = useRef(new Map<string, number>());
  const queues = useMemo(() => cockpit.data?.data.queues ?? [], [cockpit.data]);
  const preferences = useCockpitPreferences(siteId);
  const serverNow = useServerClock(cockpit.data?.data.serverTime);
  const queueIds = useMemo(() => queues.map((queue) => queue.queueId), [queues]);
  const health = useQueueDisplayRealtime({
    queueIds,
    getToken: getAccessToken,
    onEvent: (event) => {
      if (!siteId) return;
      if (shouldSkipCockpitRealtimeRefresh(siteId, event.queueId)) return;
      const previous = realtimeRefreshTimers.current.get(event.queueId);
      if (previous !== undefined) window.clearTimeout(previous);
      const timer = window.setTimeout(() => {
        realtimeRefreshTimers.current.delete(event.queueId);
        void refreshCockpitQueue(siteId, event.queueId)
          .then((incoming) => {
            queryClient.setQueryData<QueueEngineControllerGetCockpit200>(
              queryKeys.cockpit.bySite(siteId),
              (current) => mergeCockpitQueue(current, incoming),
            );
          })
          .catch(notifyError);
      }, 250);
      realtimeRefreshTimers.current.set(event.queueId, timer);
    },
    onReconnect: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cockpit.bySite(siteId) });
    },
  });
  useDegradedRealtimeRefresh({
    health,
    enabled: Boolean(siteId),
    refresh: async () => {
      await cockpit.refetch();
    },
  });
  useEffect(
    () => () => {
      for (const timer of realtimeRefreshTimers.current.values()) window.clearTimeout(timer);
      realtimeRefreshTimers.current.clear();
    },
    [],
  );

  const totals = useMemo(
    () => ({
      waiting: queues.reduce((sum, queue) => sum + queue.waitingCount, 0),
      appointments: queues.reduce((sum, queue) => sum + queue.remainingAppointmentsCount, 0),
      sessions: queues.filter((queue) => queue.currentOperatorSessionId).length,
      activeCalls: queues.filter((queue) => queue.activeCall).length,
      eligible: queues.filter((queue) => queue.centralizedNext.eligible).length,
    }),
    [queues],
  );
  const pending = Object.values(actions).some((action) => action.isPending);
  const activeQueues = useMemo(() => queues.filter((queue) => queue.activeCall), [queues]);
  const displayedQueues = useMemo(
    () =>
      queues
        .filter((queue) =>
          `${queue.queueCode} ${queue.queueName}`
            .toLocaleLowerCase(i18n.language)
            .includes(queueSearch.trim().toLocaleLowerCase(i18n.language)),
        )
        .sort((left, right) => {
          const favoriteDifference =
            Number(preferences.favoriteQueueIds.includes(right.queueId)) -
            Number(preferences.favoriteQueueIds.includes(left.queueId));
          if (favoriteDifference) return favoriteDifference;
          if (preferences.sort === 'waiting') return right.waitingCount - left.waitingCount;
          if (preferences.sort === 'name') return left.queueName.localeCompare(right.queueName);
          const operationalDifference =
            Number(Boolean(right.currentOperatorSessionId)) -
            Number(Boolean(left.currentOperatorSessionId));
          return operationalDifference || right.waitingCount - left.waitingCount;
        }),
    [i18n.language, preferences.favoriteQueueIds, preferences.sort, queueSearch, queues],
  );
  useCockpitCrossTab(siteId, () => {
    void cockpit.refetch();
  });
  const recentPassages = useMemo(
    () =>
      (cockpit.data?.data.recentPassages ?? []).filter(
        (passage) =>
          (historyOutcome === 'all' || passage.outcome === historyOutcome) &&
          (historyQueueId === 'all' || passage.queueId === historyQueueId) &&
          `${passage.ticketNumber} ${passage.personName} ${passage.queueName}`
            .toLocaleLowerCase(i18n.language)
            .includes(historySearch.trim().toLocaleLowerCase(i18n.language)),
      ),
    [cockpit.data, historyOutcome, historyQueueId, historySearch, i18n.language],
  );
  const recommendations = useMemo(() => {
    const items: Array<{ queue: CockpitQueueItemDto; type: 'open' | 'delay' }> = [];
    for (const queue of queues) {
      if (queue.waitingCount > 0 && !queue.currentOperatorSessionId && queue.sessionOpening.allowed)
        items.push({ queue, type: 'open' });
      else if ((queue.estimatedWaitMinutes ?? 0) >= 30) items.push({ queue, type: 'delay' });
      if (items.length === 4) break;
    }
    return items;
  }, [queues]);

  const run = useCallback(
    async (command: () => Promise<unknown>, successMessage?: string) => {
      try {
        await command();
        broadcastCockpitRefresh(siteId);
        playCockpitTone(preferences.soundsEnabled, 'success');
        if (successMessage) notify({ tone: 'success', title: successMessage });
      } catch (error) {
        playCockpitTone(preferences.soundsEnabled, 'warning');
        notifyError(error);
      }
    },
    [preferences.soundsEnabled, siteId],
  );
  const callBestNext = useCallback(
    () =>
      run(async () => {
        const response = await actions.callNextForSite.execute(undefined);
        const ticket = response.data.ticketNumber;
        notify({
          tone: ticket ? 'success' : 'info',
          title: ticket ? t('cockpit.ticketCalled', { ticket }) : t('cockpit.noCandidate'),
        });
      }),
    [actions.callNextForSite, run, t],
  );

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      )
        return;
      if (event.key.toLowerCase() === 'n' && totals.eligible > 0 && !pending) {
        event.preventDefault();
        void callBestNext();
      }
      const onlyActiveCall = activeQueues.length === 1 ? activeQueues[0]?.activeCall : null;
      if (!onlyActiveCall || pending) return;
      if (event.key.toLowerCase() === 'r') {
        event.preventDefault();
        void run(
          () =>
            actions.recall.execute({
              registrationId: onlyActiveCall.registrationId,
              queueId: activeQueues[0]?.queueId ?? '',
            }),
          t('cockpit.ticketRecalled', { ticket: onlyActiveCall.ticketNumber }),
        );
      }
      if (event.key.toLowerCase() === 's') {
        event.preventDefault();
        setConfirmation({
          title: t('cockpit.confirmServedTitle'),
          description: t('cockpit.confirmOutcomeDescription', {
            ticket: onlyActiveCall.ticketNumber,
          }),
          label: t('cockpit.served'),
          action: () => {
            void run(
              () =>
                actions.markServed.execute({
                  registrationId: onlyActiveCall.registrationId,
                  queueId: activeQueues[0]?.queueId ?? '',
                }),
              t('cockpit.markedServed'),
            );
          },
        });
      }
      if (event.key.toLowerCase() === 'a') {
        event.preventDefault();
        setConfirmation({
          title: t('cockpit.confirmNoShowTitle'),
          description: t('cockpit.confirmOutcomeDescription', {
            ticket: onlyActiveCall.ticketNumber,
          }),
          label: t('cockpit.noShow'),
          destructive: true,
          action: () => {
            void run(
              () =>
                actions.markNoShow.execute({
                  registrationId: onlyActiveCall.registrationId,
                  queueId: activeQueues[0]?.queueId ?? '',
                }),
              t('cockpit.markedNoShow'),
            );
          },
        });
      }
    };
    window.addEventListener('keydown', listener);
    return () => {
      window.removeEventListener('keydown', listener);
    };
  }, [
    callBestNext,
    actions.markNoShow,
    actions.markServed,
    actions.recall,
    activeQueues,
    pending,
    t,
    totals.eligible,
    run,
  ]);

  const openSessionDialog = (queue: CockpitQueueItemDto) => {
    const firstAvailable = queue.sessionOpening.availableThreadNumbers[0];
    const firstReplaceable = queue.sessionOpening.replaceableSessions[0];
    setSessionDialog({ queue });
    setSelectedThread(firstAvailable ?? firstReplaceable?.threadNumber);
    setReplaceSessionId(firstAvailable ? undefined : firstReplaceable?.sessionId);
    setCounterName(firstReplaceable?.counterName ?? '');
  };

  if (!siteId) {
    return (
      <EmptyState title={t('cockpit.siteRequired')} description={t('cockpit.siteRequiredHint')} />
    );
  }

  return (
    <div className="page-stack cockpit-v2">
      <PageHeader
        eyebrow={cockpit.data?.data.siteName ?? t('nav.operations')}
        title={t('cockpit.title')}
        description={t('cockpit.description', {
          operator:
            cockpit.data?.data.operator.fullName ?? cockpit.data?.data.operator.username ?? '',
        })}
        actions={
          <div className="cockpit-header-actions">
            <RealtimeConnectionIndicator health={health} />
            <small className="cockpit-last-sync">
              {t('cockpit.lastSync', {
                time: formatDateTime(cockpit.dataUpdatedAt, i18n.language) ?? '—',
              })}
            </small>
            <Button
              variant="primary"
              icon={<PhoneCall />}
              label={t('cockpit.callBestNext')}
              pending={actions.callNextForSite.isPending}
              disabled={!totals.eligible || pending}
              onClick={() => {
                void callBestNext();
              }}
            />
          </div>
        }
      />
      {cockpit.isError ? <ErrorState onRetry={() => void cockpit.refetch()} /> : null}
      {cockpit.data ? (
        <>
          <section className="metric-grid cockpit-metrics" aria-label={t('cockpit.summary')}>
            <MetricCard icon={<Users />} label={t('cockpit.waiting')} value={totals.waiting} />
            <MetricCard
              icon={<CalendarClock />}
              label={t('cockpit.appointments')}
              value={totals.appointments}
              tone="info"
            />
            <MetricCard
              icon={<MonitorUp />}
              label={t('cockpit.mySessions')}
              value={totals.sessions}
              tone="success"
            />
            <MetricCard
              icon={<BellRing />}
              label={t('cockpit.activeCalls')}
              value={totals.activeCalls}
              tone="warning"
            />
          </section>

          {recommendations.length ? (
            <section className="cockpit-recommendations" aria-labelledby="recommendations-title">
              <div className="cockpit-section-heading">
                <div>
                  <p className="eyebrow">{t('cockpit.operationalGuidance')}</p>
                  <h2 id="recommendations-title">{t('cockpit.recommendations')}</h2>
                </div>
                <Lightbulb aria-hidden="true" />
              </div>
              <div>
                {recommendations.map(({ queue, type }) => (
                  <article key={`${queue.queueId}-${type}`}>
                    {type === 'delay' ? (
                      <TriangleAlert aria-hidden="true" />
                    ) : (
                      <MonitorUp aria-hidden="true" />
                    )}
                    <div>
                      <strong>{queue.queueName}</strong>
                      <span>
                        {type === 'delay'
                          ? t('cockpit.delayRecommendation', {
                              minutes: queue.estimatedWaitMinutes,
                            })
                          : t('cockpit.openRecommendation', { count: queue.waitingCount })}
                      </span>
                    </div>
                    {type === 'open' ? (
                      <Button
                        size="small"
                        label={t('cockpit.openSession')}
                        onClick={() => {
                          openSessionDialog(queue);
                        }}
                      />
                    ) : (
                      <a href={`#cockpit-queue-${queue.queueId}`}>{t('cockpit.openQueue')}</a>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {activeQueues.length ? (
            <section className="cockpit-active-overview" aria-labelledby="active-calls-title">
              <div className="cockpit-section-heading">
                <div>
                  <p className="eyebrow">{t('cockpit.priorityWorkspace')}</p>
                  <h2 id="active-calls-title">{t('cockpit.activeCalls')}</h2>
                </div>
              </div>
              <div className="cockpit-active-overview-grid">
                {activeQueues.map((queue) => {
                  const activeCall = queue.activeCall;
                  if (!activeCall) return null;
                  const elapsed = elapsedMinutes(activeCall.calledAt, serverNow);
                  return (
                    <article key={queue.queueId}>
                      <span>{queue.queueCode}</span>
                      <div>
                        <strong>{activeCall.ticketNumber}</strong>
                        <small>
                          {personName(activeCall.person) ||
                            t('queue-operations.desk.personneNonRenseignee')}
                        </small>
                      </div>
                      <div>
                        <strong>{queue.queueName}</strong>
                        <small>
                          {elapsed == null
                            ? t('cockpit.justCalled')
                            : t('cockpit.elapsedMinutes', { count: elapsed })}
                        </small>
                      </div>
                      <div className="cockpit-active-overview-actions">
                        <Button
                          size="small"
                          variant="info"
                          icon={<RefreshCw />}
                          label={t('cockpit.recall')}
                          disabled={pending}
                          onClick={() => {
                            void run(
                              () =>
                                actions.recall.execute({
                                  registrationId: activeCall.registrationId,
                                  queueId: queue.queueId,
                                }),
                              t('cockpit.ticketRecalled', { ticket: activeCall.ticketNumber }),
                            );
                          }}
                        />
                        <Button
                          size="small"
                          variant="success"
                          icon={<CheckCircle2 />}
                          label={t('cockpit.served')}
                          disabled={pending}
                          onClick={() => {
                            setConfirmation({
                              title: t('cockpit.confirmServedTitle'),
                              description: t('cockpit.confirmOutcomeDescription', {
                                ticket: activeCall.ticketNumber,
                              }),
                              label: t('cockpit.served'),
                              action: () => {
                                void run(
                                  () =>
                                    actions.markServed.execute({
                                      registrationId: activeCall.registrationId,
                                      queueId: queue.queueId,
                                    }),
                                  t('cockpit.markedServed'),
                                );
                              },
                            });
                          }}
                        />
                        <Button
                          size="small"
                          variant="danger"
                          icon={<UserX />}
                          label={t('cockpit.noShow')}
                          disabled={pending}
                          onClick={() => {
                            setConfirmation({
                              title: t('cockpit.confirmNoShowTitle'),
                              description: t('cockpit.confirmOutcomeDescription', {
                                ticket: activeCall.ticketNumber,
                              }),
                              label: t('cockpit.noShow'),
                              destructive: true,
                              action: () => {
                                void run(
                                  () =>
                                    actions.markNoShow.execute({
                                      registrationId: activeCall.registrationId,
                                      queueId: queue.queueId,
                                    }),
                                  t('cockpit.markedNoShow'),
                                );
                              },
                            });
                          }}
                        />
                        <Button
                          size="small"
                          label={t('cockpit.addNote')}
                          onClick={() => {
                            setNotesDialog({
                              personId: activeCall.person.personId,
                              personName: personName(activeCall.person),
                              queueId: queue.queueId,
                              mode: 'add',
                            });
                          }}
                        />
                        <Button
                          size="small"
                          label={t('cockpit.openCustomerFile')}
                          onClick={() => {
                            setRegistrationDetailsDialog({
                              registrationId: activeCall.registrationId,
                              queueName: queue.queueName,
                            });
                          }}
                        />
                        <a href={`#cockpit-queue-${queue.queueId}`}>{t('cockpit.openQueue')}</a>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}

          <QuickRegistration siteId={siteId} queues={queues} />

          {queues.length === 0 ? (
            <EmptyState title={t('cockpit.noQueues')} description={t('cockpit.noQueuesHint')} />
          ) : (
            <section className="cockpit-queue-section">
              <div className="cockpit-section-heading cockpit-queue-heading">
                <div>
                  <p className="eyebrow">{t('cockpit.authorizedQueues')}</p>
                  <h2>{t('cockpit.manageQueues')}</h2>
                </div>
                <p className="cockpit-eligibility-summary">
                  {t('cockpit.visibleQueues', {
                    count: displayedQueues.length,
                    total: queues.length,
                  })}
                </p>
              </div>
              <Card className="admin-filter-card queue-customer-search cockpit-filter-card">
                <details open>
                  <summary>
                    <span>
                      <Search aria-hidden="true" /> {t('cockpit.searchQueues')}
                    </span>
                    <small>{t('cockpit.eligibleCount', { count: totals.eligible })}</small>
                  </summary>
                  <div className="queue-customer-filter-body">
                    <div className="queue-customer-search-form cockpit-filter-grid">
                      <label>
                        {t('cockpit.searchQueues')}
                        <input
                          type="search"
                          value={queueSearch}
                          placeholder={t('cockpit.searchQueuesPlaceholder')}
                          onChange={(event) => {
                            setQueueSearch(event.target.value);
                          }}
                        />
                      </label>
                      <label>
                        {t('cockpit.sortQueues')}
                        <select
                          value={preferences.sort}
                          onChange={(event) => {
                            preferences.setSort(event.target.value as CockpitSort);
                          }}
                        >
                          <option value="operational">{t('cockpit.sortOperational')}</option>
                          <option value="waiting">{t('cockpit.sortWaiting')}</option>
                          <option value="name">{t('cockpit.sortName')}</option>
                        </select>
                      </label>
                      <div className="cockpit-view-actions">
                        <Button
                          icon={<LayoutGrid />}
                          variant={preferences.density === 'compact' ? 'primary' : 'default'}
                          aria-pressed={preferences.density === 'compact'}
                          label={
                            preferences.density === 'compact'
                              ? t('cockpit.comfortableView')
                              : t('cockpit.compactView')
                          }
                          onClick={() => {
                            preferences.setDensity(
                              preferences.density === 'compact' ? 'comfortable' : 'compact',
                            );
                          }}
                        />
                        <Button
                          icon={preferences.soundsEnabled ? <Volume2 /> : <VolumeX />}
                          variant={preferences.soundsEnabled ? 'primary' : 'default'}
                          aria-pressed={preferences.soundsEnabled}
                          label={
                            preferences.soundsEnabled
                              ? t('cockpit.disableSounds')
                              : t('cockpit.enableSounds')
                          }
                          onClick={() => {
                            preferences.setSoundsEnabled(!preferences.soundsEnabled);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </details>
              </Card>
              <div className="cockpit-shortcuts" aria-label={t('cockpit.keyboardShortcuts')}>
                <span>{t('cockpit.keyboardShortcuts')}</span>
                <kbd>{t('cockpit.shortcutNext')}</kbd> {t('cockpit.callBestNext')}
                <kbd>{t('cockpit.shortcutRecall')}</kbd> {t('cockpit.recall')}
                <kbd>{t('cockpit.shortcutServed')}</kbd> {t('cockpit.served')}
                <kbd>{t('cockpit.shortcutAbsent')}</kbd> {t('cockpit.noShow')}
              </div>
              <div className={`cockpit-queue-grid is-${preferences.density}`}>
                {displayedQueues.map((queue) => (
                  <QueueCard
                    key={queue.queueId}
                    queue={queue}
                    pending={pending}
                    locale={i18n.language}
                    serverNow={serverNow}
                    favorite={preferences.favoriteQueueIds.includes(queue.queueId)}
                    collapsed={preferences.collapsedQueueIds.includes(queue.queueId)}
                    onToggleFavorite={() => {
                      preferences.toggleFavorite(queue.queueId);
                    }}
                    onToggleCollapsed={() => {
                      preferences.toggleCollapsed(queue.queueId);
                    }}
                    onOpenSession={() => {
                      openSessionDialog(queue);
                    }}
                    onCloseSession={() => {
                      const sessionId = queue.currentOperatorSessionId;
                      if (!sessionId) return;
                      setConfirmation({
                        title: t('cockpit.confirmCloseSessionTitle'),
                        description: t('cockpit.confirmCloseSessionDescription', {
                          queue: queue.queueName,
                        }),
                        label: t('cockpit.closeSession'),
                        destructive: true,
                        action: () => {
                          void run(
                            () =>
                              actions.closeSession.execute({ queueId: queue.queueId, sessionId }),
                            t('cockpit.sessionClosed'),
                          );
                        },
                      });
                    }}
                    onCallNext={() => {
                      void run(async () => {
                        const response = await actions.callNextForQueue.execute(queue.queueId);
                        const ticket = response.data.ticketNumber;
                        notify({
                          tone: ticket ? 'success' : 'info',
                          title: ticket
                            ? t('cockpit.ticketCalled', { ticket })
                            : t('cockpit.noCandidate'),
                        });
                      });
                    }}
                    onRecall={() => {
                      const activeCall = queue.activeCall;
                      if (!activeCall) return;
                      void run(
                        () =>
                          actions.recall.execute({
                            registrationId: activeCall.registrationId,
                            queueId: queue.queueId,
                          }),
                        t('cockpit.ticketRecalled', { ticket: activeCall.ticketNumber }),
                      );
                    }}
                    onServed={() => {
                      const activeCall = queue.activeCall;
                      if (!activeCall) return;
                      setConfirmation({
                        title: t('cockpit.confirmServedTitle'),
                        description: t('cockpit.confirmOutcomeDescription', {
                          ticket: activeCall.ticketNumber,
                        }),
                        label: t('cockpit.served'),
                        action: () => {
                          void run(
                            () =>
                              actions.markServed.execute({
                                registrationId: activeCall.registrationId,
                                queueId: queue.queueId,
                              }),
                            t('cockpit.markedServed'),
                          );
                        },
                      });
                    }}
                    onNoShow={() => {
                      const activeCall = queue.activeCall;
                      if (!activeCall) return;
                      setConfirmation({
                        title: t('cockpit.confirmNoShowTitle'),
                        description: t('cockpit.confirmOutcomeDescription', {
                          ticket: activeCall.ticketNumber,
                        }),
                        label: t('cockpit.noShow'),
                        destructive: true,
                        action: () => {
                          void run(
                            () =>
                              actions.markNoShow.execute({
                                registrationId: activeCall.registrationId,
                                queueId: queue.queueId,
                              }),
                            t('cockpit.markedNoShow'),
                          );
                        },
                      });
                    }}
                    onNotes={(person, mode = 'view') => {
                      setNotesDialog({
                        personId: person.personId,
                        personName: personName(person),
                        queueId: queue.queueId,
                        mode,
                      });
                    }}
                    onDetails={(registrationId) => {
                      setRegistrationDetailsDialog({
                        registrationId,
                        queueName: queue.queueName,
                      });
                    }}
                  />
                ))}
                {displayedQueues.length === 0 ? (
                  <div className="cockpit-filter-empty">
                    <Search aria-hidden="true" />
                    <strong>{t('cockpit.noMatchingQueues')}</strong>
                    <span>{t('cockpit.noMatchingQueuesHint')}</span>
                  </div>
                ) : null}
              </div>
            </section>
          )}

          <section className="card cockpit-history">
            <div className="cockpit-section-heading">
              <div>
                <p className="eyebrow">{t('cockpit.activity')}</p>
                <h2>{t('cockpit.recentPassages')}</h2>
              </div>
              <History aria-hidden="true" />
            </div>
            <div className="cockpit-history-filters">
              <FormField label={t('cockpit.searchHistory')}>
                <input
                  value={historySearch}
                  placeholder={t('cockpit.searchHistoryPlaceholder')}
                  onChange={(event) => {
                    setHistorySearch(event.target.value);
                  }}
                />
              </FormField>
              <FormField label={t('cockpit.historyOutcome')}>
                <select
                  value={historyOutcome}
                  onChange={(event) => {
                    setHistoryOutcome(event.target.value as typeof historyOutcome);
                  }}
                >
                  <option value="all">{t('cockpit.allOutcomes')}</option>
                  <option value="served">{t('cockpit.served')}</option>
                  <option value="no_show">{t('cockpit.noShow')}</option>
                </select>
              </FormField>
              <FormField label={t('cockpit.historyQueue')}>
                <select
                  value={historyQueueId}
                  onChange={(event) => {
                    setHistoryQueueId(event.target.value);
                  }}
                >
                  <option value="all">{t('cockpit.allQueues')}</option>
                  {queues.map((queue) => (
                    <option key={queue.queueId} value={queue.queueId}>
                      {queue.queueName}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
            {recentPassages.length ? (
              <div className="cockpit-history-list">
                {recentPassages.map((passage) => (
                  <article key={passage.registrationId}>
                    <div>
                      <strong>{passage.ticketNumber}</strong>
                      <span>{passage.personName}</span>
                    </div>
                    <div>
                      <span>{passage.queueName}</span>
                      <small>
                        {passage.counterName ??
                          t('cockpit.counterNumber', { number: passage.threadNumber })}
                      </small>
                    </div>
                    <div>
                      <StatusBadge tone={passage.outcome === 'served' ? 'success' : 'warning'}>
                        {passage.outcome === 'served' ? t('cockpit.served') : t('cockpit.noShow')}
                      </StatusBadge>
                      <time>{formatDateTime(asDate(passage.closedAt), i18n.language) ?? '—'}</time>
                      {siteId ? (
                        <CockpitPassagePrintButton
                          passage={passage}
                          site={site.data?.data}
                          label={t('cockpit.printPassage')}
                        />
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="cockpit-muted">{t('cockpit.noRecentPassages')}</p>
            )}
          </section>
        </>
      ) : null}

      <SessionModal
        state={sessionDialog}
        selectedThread={selectedThread}
        replaceSessionId={replaceSessionId}
        counterName={counterName}
        pending={actions.openSession.isPending}
        onThreadChange={(thread, replacement) => {
          setSelectedThread(thread);
          setReplaceSessionId(replacement?.sessionId);
          if (replacement?.counterName) setCounterName(replacement.counterName);
        }}
        onCounterNameChange={setCounterName}
        onClose={() => {
          setSessionDialog(null);
        }}
        onSubmit={() => {
          if (!sessionDialog || !selectedThread) return;
          const queue = sessionDialog.queue;
          const open = () => {
            void run(async () => {
              await actions.openSession.execute({
                queueId: queue.queueId,
                dto: {
                  mode: 'active',
                  threadNumber: selectedThread,
                  counterName: counterName.trim() || undefined,
                  takeOver: Boolean(replaceSessionId),
                  replaceSessionId,
                },
              });
              setSessionDialog(null);
              notify({ tone: 'success', title: t('cockpit.sessionOpened') });
            });
          };
          if (replaceSessionId) {
            setConfirmation({
              title: t('cockpit.confirmTakeoverTitle'),
              description: t('cockpit.confirmTakeoverDescription'),
              label: t('desk.takeOverAction'),
              destructive: true,
              action: open,
            });
          } else open();
        }}
      />
      {notesDialog ? (
        <PersonNotesViewer
          key={`${notesDialog.personId}-${notesDialog.mode}`}
          personId={notesDialog.personId}
          personName={notesDialog.personName}
          open
          initialMode={notesDialog.mode}
          onNotesChanged={() => {
            if (!siteId) return;
            void refreshCockpitQueue(siteId, notesDialog.queueId)
              .then((incoming) => {
                queryClient.setQueryData<QueueEngineControllerGetCockpit200>(
                  queryKeys.cockpit.bySite(siteId),
                  (current) => mergeCockpitQueue(current, incoming),
                );
              })
              .catch(notifyError);
          }}
          onOpenChange={(open) => {
            if (!open) setNotesDialog(null);
          }}
        />
      ) : null}
      <RegistrationDetailsModal
        registrationId={registrationDetailsDialog?.registrationId ?? null}
        queueName={registrationDetailsDialog?.queueName}
        open={Boolean(registrationDetailsDialog)}
        onOpenChange={(open) => {
          if (!open) setRegistrationDetailsDialog(null);
        }}
      />
      <ConfirmDialog
        open={Boolean(confirmation)}
        onOpenChange={(open) => {
          if (!open) setConfirmation(null);
        }}
        title={confirmation?.title ?? ''}
        description={confirmation?.description}
        confirmLabel={confirmation?.label ?? ''}
        destructive={confirmation?.destructive}
        onConfirm={() => {
          const action = confirmation?.action;
          setConfirmation(null);
          action?.();
        }}
      />
    </div>
  );
}

function QueueCard(props: {
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
          <section className="cockpit-candidates">
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
                onClick={props.onOpenSession}
              />
            )}
            <Button
              variant="primary"
              icon={<PhoneCall />}
              label={t('cockpit.callFromQueue')}
              disabled={props.pending || !queue.centralizedNext.eligible}
              title={nextUnavailableReason}
              onClick={props.onCallNext}
            />
          </footer>
        ) : null}
      </div>
    </article>
  );
}

function SessionModal(props: {
  state: SessionDialogState;
  selectedThread?: number;
  replaceSessionId?: string;
  counterName: string;
  pending: boolean;
  onThreadChange: (
    thread: number,
    replacement?: CockpitQueueItemDto['sessionOpening']['replaceableSessions'][number],
  ) => void;
  onCounterNameChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const { t } = useTranslation();
  const queue = props.state?.queue;
  const options = queue
    ? [
        ...queue.sessionOpening.availableThreadNumbers.map((threadNumber) => ({
          threadNumber,
          available: true as const,
        })),
        ...queue.sessionOpening.replaceableSessions.map((session) => ({
          ...session,
          available: false as const,
        })),
      ]
    : [];
  return (
    <Modal
      open={Boolean(queue)}
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
      title={t('cockpit.openSession')}
      description={queue?.queueName}
      actions={
        <Button
          variant="primary"
          pending={props.pending}
          disabled={!props.selectedThread}
          onClick={props.onSubmit}
        >
          {t('cockpit.confirmOpenSession')}
        </Button>
      }
    >
      <div className="cockpit-session-form">
        <fieldset>
          <legend>{t('cockpit.chooseCounter')}</legend>
          <div className="cockpit-thread-options">
            {options.map((option) => (
              <label
                key={`${String(option.threadNumber)}-${String(option.available)}`}
                className={
                  props.selectedThread === option.threadNumber &&
                  props.replaceSessionId === (option.available ? undefined : option.sessionId)
                    ? 'is-selected'
                    : ''
                }
              >
                <input
                  type="radio"
                  name="thread"
                  checked={
                    props.selectedThread === option.threadNumber &&
                    props.replaceSessionId === (option.available ? undefined : option.sessionId)
                  }
                  onChange={() => {
                    props.onThreadChange(
                      option.threadNumber,
                      option.available ? undefined : option,
                    );
                  }}
                />
                <span>
                  <strong>{t('cockpit.counterNumber', { number: option.threadNumber })}</strong>
                  <small>
                    {option.available
                      ? t('cockpit.freeCounter')
                      : t('cockpit.occupiedBy', { operator: option.operatorName })}
                  </small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <FormField label={t('desk.counterName')} hint={t('desk.counterNameHint')}>
          <input
            value={props.counterName}
            maxLength={100}
            placeholder={t('desk.counterNamePlaceholder')}
            onChange={(event) => {
              props.onCounterNameChange(event.target.value);
            }}
          />
        </FormField>
        {props.replaceSessionId ? (
          <p className="field-hint cockpit-replacement-warning">
            {t('cockpit.replacementWarning')}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
