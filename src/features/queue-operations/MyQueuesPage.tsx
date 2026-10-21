import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Eye, Search } from 'lucide-react';
import { useScopeStore } from '@/core/scope/scope-store';
import { DataTable } from '@/design-system/components/DataTable';
import { Card } from '@/design-system/components/Card';
import { EmptyState } from '@/design-system/components/FeedbackState';
import { PageHeader } from '@/design-system/components/PageHeader';
import { Pagination } from '@/design-system/components/Pagination';
import { StatusBadge } from '@/design-system/components/StatusBadge';
import { PersonNotesViewer } from '@/features/notes/PersonNotesViewer';
import { PersonNotesButton } from '@/features/notes/PersonNotesButton';
import { useQueues } from '@/features/queues/hooks/useQueues';
import { useDebouncedFilter } from '@/shared/forms/useDebouncedFilter';
import { useWaitingRegistrations } from './hooks/useQueueOperations';
import { RegistrationDetailsModal } from './RegistrationDetailsModal';
import type {
  RegistrationsControllerFindRegistrationsSort,
  RegistrationsControllerFindRegistrationsStatus,
} from '@/api/generated/models';
import { serviceTierVisualClass } from '@/design-system/service-tier';
import { Button } from '@/design-system/components/Button';
import { QueueRegistrationMobileCard } from './QueueRegistrationMobileCard';

function localIsoDate(value = new Date()): string {
  const localValue = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return localValue.toISOString().slice(0, 10);
}

export function MyQueuesPage() {
  const { t: __t } = useTranslation();
  const siteId = useScopeStore((state) => state.activeSiteId);
  const [page, setPage] = useState(1);
  const [queueId, setQueueId] = useState<number | undefined>();
  const [notesPersonId, setNotesPersonId] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState<'view' | 'add'>('view');
  const [searchDraft, setSearchDraft] = useState('');
  const search = useDebouncedFilter(searchDraft);
  const today = localIsoDate();
  const [selectedDate, setSelectedDate] = useState(today);
  const [status, setStatus] = useState<'' | RegistrationsControllerFindRegistrationsStatus>(
    'waiting',
  );
  const [sort, setSort] = useState<RegistrationsControllerFindRegistrationsSort>(
    'priorityReferenceTime:asc',
  );
  const [registrationDetails, setRegistrationDetails] = useState<{
    id: number;
    queueName: string;
  } | null>(null);
  const queues = useQueues({ siteId });
  const registrations = useWaitingRegistrations({
    siteId,
    queueId,
    dateFrom: selectedDate,
    dateTo: selectedDate,
    page,
    search,
    status: status || undefined,
    sort,
  });
  const items = registrations.data?.data.items ?? [];
  const getQueueName = (queueId: number) =>
    queues.data?.data.items.find((queue) => queue.queueId === queueId)?.queueName ??
    'File #' + String(queueId);
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
        <Card className="admin-filter-card queue-customer-search">
          <details>
            <summary>
              <span>
                <Search aria-hidden="true" /> {__t('queues.myQueues.rechercherUnClient')}
              </span>
              <small>{__t('queues.myQueues.nomPrenomOuNumeroDeTicketDansVotrePerimetre')}</small>
            </summary>
            <div className="queue-customer-filter-body">
              <div className="queue-customer-search-form">
                <label>
                  {__t('common.date')}
                  <input
                    type="date"
                    value={selectedDate}
                    max={today}
                    onChange={(event) => {
                      setSelectedDate(event.target.value || today);
                      setPage(1);
                    }}
                  />
                </label>
                <label>
                  {__t('queue-operations.myQueues.perimetreDeLaFile')}
                  <select
                    value={queueId ?? ''}
                    onChange={(event) => {
                      setQueueId(event.target.value ? Number(event.target.value) : undefined);
                      setPage(1);
                    }}
                  >
                    <option value="">
                      {__t('queue-operations.myQueues.toutes')} {queues.data.data.total}
                    </option>
                    {queues.data.data.items.map((queue) => (
                      <option key={queue.queueId} value={queue.queueId}>
                        {queue.queueName}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {__t('queues.myQueues.clientOuTicket')}
                  <input
                    type="search"
                    value={searchDraft}
                    placeholder={__t('queues.search.example')}
                    onChange={(event) => {
                      setSearchDraft(event.target.value);
                      setPage(1);
                    }}
                  />
                </label>
                <label>
                  {__t('common.status')}
                  <select
                    value={status}
                    onChange={(event) => {
                      setStatus(
                        event.target.value as '' | RegistrationsControllerFindRegistrationsStatus,
                      );
                      setPage(1);
                    }}
                  >
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
                  <select
                    value={sort}
                    onChange={(event) => {
                      setSort(event.target.value as RegistrationsControllerFindRegistrationsSort);
                      setPage(1);
                    }}
                  >
                    <option value="priorityReferenceTime:asc">{__t('common.position')}</option>
                    <option value="createdAt:desc">{__t('notifications.filters.newest')}</option>
                    <option value="createdAt:asc">{__t('notifications.filters.oldest')}</option>
                    <option value="ticketNumber:asc">
                      {__t('common.ticket')} · {__t('common.sortAscending')}
                    </option>
                    <option value="ticketNumber:desc">
                      {__t('common.ticket')} · {__t('common.sortDescending')}
                    </option>
                    <option value="status:asc">
                      {__t('common.status')} · {__t('common.sortAscending')}
                    </option>
                  </select>
                </label>
              </div>
            </div>
          </details>
        </Card>
      ) : null}
      {queues.data?.data.items.length ? (
        <DataTable
          caption={__t('queue-operations.myQueues.inscriptionsDansMesFiles')}
          containerClassName="table-scroll queue-registrations-table"
          rows={items}
          getRowKey={(item) => item.registrationId}
          renderMobileRow={(item) => {
            const queueName = getQueueName(item.queueId);
            const noteCount = item.activeNoteCount;
            return (
              <QueueRegistrationMobileCard
                registration={item}
                position={(page - 1) * 10 + items.indexOf(item) + 1}
                queueName={queueName}
                onView={() => {
                  setRegistrationDetails({ id: item.registrationId, queueName });
                }}
                onNotes={() => {
                  setNotesMode(noteCount ? 'view' : 'add');
                  setNotesPersonId(item.personId);
                }}
              />
            );
          }}
          columns={[
            {
              key: 'position',
              header: __t('common.position'),
              render: (item) => (page - 1) * 10 + items.indexOf(item) + 1,
            },
            {
              key: 'queue',
              header: __t('queues.myQueues.siteAndQueue'),
              render: (item) => getQueueName(item.queueId),
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
                <span
                  className={`service-tier-badge ${serviceTierVisualClass(item.tierId, item.tierName)}`}
                >
                  {item.tierName ??
                    __t('queue-operations.quickRegistration.serviceFallback', {
                      id: String(item.tierId),
                    })}
                </span>
              ),
            },
            {
              key: 'actions',
              header: __t('common.actions'),
              render: (item) => {
                const noteCount = item.activeNoteCount;
                const queueName = getQueueName(item.queueId);
                return (
                  <div className="table-actions responsive-table-actions">
                    <Button
                      variant="unstyled"
                      className="button button-small"
                      type="button"
                      title={__t('queues.myQueues.consulter')}
                      onClick={() => {
                        setRegistrationDetails({ id: item.registrationId, queueName });
                      }}
                    >
                      <Eye aria-hidden="true" /> {__t('queues.myQueues.consulter')}
                    </Button>
                    <PersonNotesButton
                      noteCount={noteCount}
                      onClick={() => {
                        setNotesMode(noteCount ? 'view' : 'add');
                        setNotesPersonId(item.personId);
                      }}
                    />
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
