import { useQueries, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  personsControllerFindOne,
  personsControllerGetNotes,
} from '@/api/generated/persons/persons';
import { queuesControllerFindAll } from '@/api/generated/queues/queues';
import { registrationsControllerFindRegistrations } from '@/api/generated/registrations/registrations';
import { useScopeStore } from '@/core/scope/scope-store';
import { DataTable } from '@/design-system/components/DataTable';
import { FilterDrawer } from '@/design-system/components/FilterDrawer';
import { PageHeader } from '@/design-system/components/PageHeader';
import { Pagination } from '@/design-system/components/Pagination';
import { StatusBadge } from '@/design-system/components/StatusBadge';
import { PersonNotesViewer } from '@/features/persons/PersonNotesViewer';

export function MyQueuesPage() {
  const siteId = useScopeStore((state) => state.activeSiteId);
  const [page, setPage] = useState(1);
  const [queueId, setQueueId] = useState<number | undefined>();
  const [status, setStatus] = useState('waiting');
  const [businessDate, setBusinessDate] = useState(new Date().toISOString().slice(0, 10));
  const [notesPersonId, setNotesPersonId] = useState<number | null>(null);
  const queues = useQuery({
    queryKey: ['queues', siteId],
    queryFn: () => queuesControllerFindAll({ siteId: siteId ?? undefined, page: 1, pageSize: 100 }),
    enabled: siteId !== null,
  });
  const registrations = useQuery({
    queryKey: ['registrations', siteId, queueId, status, businessDate, page],
    queryFn: () =>
      registrationsControllerFindRegistrations({
        siteId: siteId ?? undefined,
        queueId,
        status: status || undefined,
        businessDate: businessDate || undefined,
        page,
        pageSize: 20,
        sort: 'createdAt:asc',
      }),
    enabled: siteId !== null,
  });
  const items = registrations.data?.data.items ?? [];
  const people = useQueries({
    queries: items.map((item) => ({
      queryKey: ['persons', item.personId],
      queryFn: () => personsControllerFindOne(item.personId),
    })),
  });
  const notes = useQueries({
    queries: items.map((item) => ({
      queryKey: ['persons', item.personId, 'notes', 'presence'],
      queryFn: () =>
        personsControllerGetNotes(item.personId, { page: 1, pageSize: 1, sort: 'createdAt:desc' }),
    })),
  });
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Opérations"
        title="Mes files"
        description="Vue consolidée des personnes en attente dans vos files."
        actions={
          <FilterDrawer
            activeCount={
              Number(Boolean(queueId)) + Number(Boolean(status)) + Number(Boolean(businessDate))
            }
          >
            <div className="form-stack">
              <label>
                File
                <select
                  value={queueId ?? ''}
                  onChange={(e) => {
                    setQueueId(e.target.value ? Number(e.target.value) : undefined);
                    setPage(1);
                  }}
                >
                  <option value="">Toutes</option>
                  {queues.data?.data.items.map((queue) => (
                    <option key={queue.queueId} value={queue.queueId}>
                      {queue.queueName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Statut
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="waiting">En attente</option>
                  <option value="called">Appelé</option>
                  <option value="">Tous</option>
                </select>
              </label>
              <label>
                Date
                <input
                  type="date"
                  value={businessDate}
                  onChange={(e) => {
                    setBusinessDate(e.target.value);
                    setPage(1);
                  }}
                />
              </label>
            </div>
          </FilterDrawer>
        }
      />
      <DataTable
        caption="Inscriptions dans mes files"
        rows={items}
        getRowKey={(item) => item.registrationId}
        columns={[
          {
            key: 'position',
            header: 'Position',
            render: (item) => (page - 1) * 20 + items.indexOf(item) + 1,
          },
          {
            key: 'queue',
            header: 'Site / file',
            render: (item) =>
              queues.data?.data.items.find((queue) => queue.queueId === item.queueId)?.queueName ??
              String(item.queueId),
          },
          {
            key: 'ticket',
            header: 'Ticket',
            render: (item) => <strong>{item.ticketNumber}</strong>,
          },
          {
            key: 'person',
            header: 'Personne',
            render: (item) => {
              const person = people[items.indexOf(item)]?.data?.data;
              return person ? `${person.firstName} ${person.lastName}` : '…';
            },
          },
          { key: 'type', header: 'Type', render: (item) => item.entryType },
          {
            key: 'age',
            header: 'Ancienneté / SLA',
            render: (item) => {
              const minutes = Math.max(
                0,
                Math.floor((Date.now() - new Date(item.createdAt).getTime()) / 60000),
              );
              return (
                <StatusBadge tone={minutes > 30 ? 'warning' : 'success'}>{minutes} min</StatusBadge>
              );
            },
          },
          { key: 'tier', header: 'Forfait', render: (item) => `#${String(item.tierId)}` },
          {
            key: 'notes',
            header: 'Notes',
            render: (item) => (
              <button
                className="button"
                type="button"
                onClick={() => {
                  setNotesPersonId(item.personId);
                }}
              >
                {notes[items.indexOf(item)]?.data?.data.total
                  ? `Voir / ajouter (${String(notes[items.indexOf(item)]?.data?.data.total)})`
                  : 'Ajouter'}
              </button>
            ),
          },
        ]}
      />
      <Pagination
        page={page}
        totalPages={registrations.data?.data.totalPages ?? 1}
        onPageChange={setPage}
      />
      {notesPersonId !== null ? (
        <PersonNotesViewer
          personId={notesPersonId}
          open
          onOpenChange={(open) => {
            if (!open) setNotesPersonId(null);
          }}
        />
      ) : null}
    </div>
  );
}
