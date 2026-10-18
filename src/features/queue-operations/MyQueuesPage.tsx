import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Eye, Plus, RotateCcw, Search, StickyNote } from 'lucide-react';
import { useScopeStore } from '@/core/scope/scope-store';
import { DataTable } from '@/design-system/components/DataTable';
import { Card } from '@/design-system/components/Card';
import { EmptyState } from '@/design-system/components/FeedbackState';
import { PageHeader } from '@/design-system/components/PageHeader';
import { Pagination } from '@/design-system/components/Pagination';
import { StatusBadge } from '@/design-system/components/StatusBadge';
import { PersonNotesViewer } from '@/features/persons/PersonNotesViewer';
import { useQueues } from '@/features/queues/hooks/useQueues';
import { useWaitingRegistrations } from './hooks/useQueueOperations';
import { RegistrationDetailsModal } from './RegistrationDetailsModal';
import type {
  RegistrationsControllerFindRegistrationsSort,
  RegistrationsControllerFindRegistrationsStatus,
} from '@/api/generated/models';
import { serviceTierVisualClass } from '@/design-system/service-tier';

export function MyQueuesPage() {
  const { t: __t } = useTranslation();
  const siteId = useScopeStore((state) => state.activeSiteId);
  const [page, setPage] = useState(1);
  const [queueId, setQueueId] = useState<number | undefined>();
  const [notesPersonId, setNotesPersonId] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState<'view' | 'add'>('view');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [statusDraft, setStatusDraft] = useState<'' | RegistrationsControllerFindRegistrationsStatus>('waiting');
  const [status, setStatus] = useState<'' | RegistrationsControllerFindRegistrationsStatus>('waiting');
  const [sortDraft, setSortDraft] = useState<RegistrationsControllerFindRegistrationsSort>('priorityReferenceTime:asc');
  const [sort, setSort] = useState<RegistrationsControllerFindRegistrationsSort>('priorityReferenceTime:asc');
  const [registrationDetails, setRegistrationDetails] = useState<{
    id: number;
    queueName: string;
  } | null>(null);
  const queues = useQueues({ siteId });
  const registrations = useWaitingRegistrations({
    siteId,
    queueId,
    page,
    search,
    status: status || undefined,
    sort,
  });
  const items = registrations.data?.data.items ?? [];
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={__t('nav.operations')}
        title={__t('queue-operations.myQueues.mesFiles')}
        description={__t('queue-operations.myQueues.vueConsolideeDesPersonnesEnAttenteDansVos')}
      />
      {queues.isSuccess && queues.data.data.items.length === 0 ? (
        <EmptyState
          title={__t('common.aucuneFileConfiguree')}
          description={__t('queue-operations.myQueues.ceSiteNePossedeActuellementAucuneFile')}
        />
      ) : null}
      {queues.data?.data.items.length ? (
        <Card className="queue-filter-banner">
          <div>
            <h2>{__t('queue-operations.myQueues.perimetreDeLaFile')}</h2>
            <p>{__t('queue-operations.myQueues.affichezToutesLesFilesAutoriseesOuConcentr')}</p>
          </div>
          <div
            className="queue-filter-tabs"
            role="group"
            aria-label={__t('queue-operations.myQueues.filtrerParFile')}
          >
            <button
              className={`button${queueId === undefined ? ' button-primary' : ''}`}
              type="button"
              aria-pressed={queueId === undefined}
              onClick={() => {
                setQueueId(undefined);
                setPage(1);
              }}
            >
              {__t('queue-operations.myQueues.toutes')}
              {queues.data.data.total}
            </button>
            {queues.data.data.items.map((queue) => (
              <button
                className={`button${queueId === queue.queueId ? ' button-primary' : ''}`}
                type="button"
                aria-pressed={queueId === queue.queueId}
                key={queue.queueId}
                onClick={() => {
                  setQueueId(queue.queueId);
                  setPage(1);
                }}
              >
                {queue.queueName}
              </button>
            ))}
          </div>
        </Card>
      ) : null}
      {queues.data?.data.items.length ? (
        <Card className="admin-filter-card queue-customer-search">
          <details>
            <summary>
              <span>
                <Search aria-hidden="true" /> {__t('queues.myQueues.rechercherUnClient')}
              </span>
              <small>{__t('queues.myQueues.nomPrenomOuNumeroDeTicketDansVotrePerimetre')}</small>
            </summary>
            <form
              className="queue-customer-search-form"
              onSubmit={(event) => {
                event.preventDefault();
                setSearch(searchDraft.trim());
                setStatus(statusDraft);
                setSort(sortDraft);
                setPage(1);
              }}
            >
              <label>
                {__t('queues.myQueues.clientOuTicket')}
                <input
                  type="search"
                  value={searchDraft}
                  placeholder={__t('queues.search.example')}
                  onChange={(event) => {
                    setSearchDraft(event.target.value);
                  }}
                />
              </label>
              <label>
                {__t('common.status')}
                <select value={statusDraft} onChange={(event) => { setStatusDraft(event.target.value as '' | RegistrationsControllerFindRegistrationsStatus); }}>
                  <option value="">{__t('common.all')}</option>
                  <option value="waiting">{__t('common.waiting')}</option>
                  <option value="booked">{__t('appointments.status.booked')}</option>
                  <option value="in_progress">{__t('appointments.status.in-progress')}</option>
                  <option value="served">{__t('appointments.status.served')}</option>
                  <option value="no_show">{__t('appointments.status.no-show')}</option>
                  <option value="cancelled">{__t('appointments.status.cancelled')}</option>
                  <option value="expired">{__t('appointments.status.expired')}</option>
                </select>
              </label>
              <label>
                {__t('notifications.filters.sort')}
                <select value={sortDraft} onChange={(event) => { setSortDraft(event.target.value as RegistrationsControllerFindRegistrationsSort); }}>
                  <option value="priorityReferenceTime:asc">{__t('common.position')}</option>
                  <option value="createdAt:desc">{__t('notifications.filters.newest')}</option>
                  <option value="createdAt:asc">{__t('notifications.filters.oldest')}</option>
                  <option value="ticketNumber:asc">{__t('common.ticket')} A-Z</option>
                  <option value="ticketNumber:desc">{__t('common.ticket')} Z-A</option>
                  <option value="status:asc">{__t('common.status')} A-Z</option>
                </select>
              </label>
              <div className="admin-filter-actions">
                <button
                  className="button"
                  type="button"
                  onClick={() => {
                    setSearchDraft('');
                    setSearch('');
                    setStatusDraft('waiting');
                    setStatus('waiting');
                    setSortDraft('priorityReferenceTime:asc');
                    setSort('priorityReferenceTime:asc');
                    setPage(1);
                  }}
                >
                  <RotateCcw aria-hidden="true" /> {__t('common.reset')}
                </button>
                <button className="button button-primary" type="submit">
                  <Search aria-hidden="true" /> {__t('common.search')}
                </button>
              </div>
            </form>
          </details>
        </Card>
      ) : null}
      {queues.data?.data.items.length ? (
        <DataTable
          caption={__t('queue-operations.myQueues.inscriptionsDansMesFiles')}
          rows={items}
          getRowKey={(item) => item.registrationId}
          columns={[
            {
              key: 'position',
              header: __t('common.position'),
              render: (item) => (page - 1) * 10 + items.indexOf(item) + 1,
            },
            {
              key: 'queue',
              header: __t('queues.myQueues.siteAndQueue'),
              render: (item) =>
                queues.data.data.items.find((queue) => queue.queueId === item.queueId)?.queueName ??
                String(item.queueId),
            },
            {
              key: 'ticket',
              header: __t('common.ticket'),
              render: (item) => <strong>{item.ticketNumber}</strong>,
            },
            {
              key: 'person',
              header: __t('common.person'),
              render: (item) => {
                return [item.firstName, item.lastName].filter(Boolean).join(' ') || '—';
              },
            },
            { key: 'type', header: __t('common.type'), render: (item) => item.entryType },
            {
              key: 'age',
              header: __t('queues.myQueues.ageAndSla'),
              render: (item) => {
                return <StatusBadge tone="neutral">{item.status}</StatusBadge>;
              },
            },
            {
              key: 'tier',
              header: __t('common.tier'),
              render: (item) => (
                <span className={`service-tier-badge ${serviceTierVisualClass(item.tierId, item.tierName)}`}>
                  {item.tierName ?? __t('queue-operations.quickRegistration.serviceFallback', { id: String(item.tierId) })}
                </span>
              ),
            },
            {
              key: 'actions',
              header: __t('common.actions'),
              render: (item) => {
                const noteCount = item.activeNoteCount;
                const queueName =
                  queues.data.data.items.find((queue) => queue.queueId === item.queueId)
                    ?.queueName ?? 'File #' + String(item.queueId);
                return (
                  <div className="table-actions responsive-table-actions">
                    <button
                      className="button button-small"
                      type="button"
                      title={__t('queues.myQueues.consulter')}
                      onClick={() => {
                        setRegistrationDetails({ id: item.registrationId, queueName });
                      }}
                    >
                      <Eye aria-hidden="true" /> {__t('queues.myQueues.consulter')}
                    </button>
                    <button
                      className="button button-small"
                      type="button"
                      title={
                        noteCount
                          ? __t('queues.myQueues.viewNotes', { count: noteCount })
                          : __t('queues.myQueues.addNote')
                      }
                      onClick={() => {
                        setNotesMode(noteCount ? 'view' : 'add');
                        setNotesPersonId(item.personId);
                      }}
                    >
                      {noteCount ? <StickyNote aria-hidden="true" /> : <Plus aria-hidden="true" />}
                      {noteCount
                        ? __t('queues.myQueues.viewNotes', { count: noteCount })
                        : __t('queues.myQueues.addNote')}
                    </button>
                  </div>
                );
              },
            },
          ]}
        />
      ) : null}
      {queues.data?.data.items.length ? (
        <Pagination
          page={page}
          totalPages={registrations.data?.data.totalPages ?? 1}
          onPageChange={setPage}
        />
      ) : null}
      {registrationDetails ? (
        <RegistrationDetailsModal
          registrationId={registrationDetails.id}
          queueName={registrationDetails.queueName}
          open
          onOpenChange={(open) => {
            if (!open) setRegistrationDetails(null);
          }}
        />
      ) : null}
      {notesPersonId !== null ? (
        <PersonNotesViewer
          key={`${String(notesPersonId)}-${notesMode}`}
          personId={notesPersonId}
          initialMode={notesMode}
          open
          onOpenChange={(open) => {
            if (!open) setNotesPersonId(null);
          }}
        />
      ) : null}
    </div>
  );
}
