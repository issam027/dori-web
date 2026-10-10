import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useScopeStore } from '@/core/scope/scope-store';
import { DataTable } from '@/design-system/components/DataTable';
import { Card } from '@/design-system/components/Card';
import { EmptyState } from '@/design-system/components/FeedbackState';
import { PageHeader } from '@/design-system/components/PageHeader';
import { Pagination } from '@/design-system/components/Pagination';
import { StatusBadge } from '@/design-system/components/StatusBadge';
import { PersonNotesViewer } from '@/features/persons/PersonNotesViewer';
import { usePersonsByIds, usePersonNotesPresence } from '@/features/persons/hooks/usePersons';
import { useQueues } from '@/features/queues/hooks/useQueues';
import { useWaitingRegistrations } from './hooks/useQueueOperations';

export function MyQueuesPage() {
  const { t: __t } = useTranslation();
  const siteId = useScopeStore((state) => state.activeSiteId);
  const [page, setPage] = useState(1);
  const [queueId, setQueueId] = useState<number | undefined>();
  const [notesPersonId, setNotesPersonId] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState<'view' | 'add'>('view');
  const queues = useQueues({ siteId });
  const registrations = useWaitingRegistrations({ siteId, queueId, page });
  const items = registrations.data?.data.items ?? [];
  const people = usePersonsByIds(items.map((item) => item.personId));
  const notes = usePersonNotesPresence(items.map((item) => item.personId));
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Opérations"
        title={__t('ui.queue-operations.my_queues_page.mes_files_17hxf37')}
        description={__t(
          'ui.queue-operations.my_queues_page.vue_consolidee_des_personnes_en_attente_dans_vos_n63by0',
        )}
      />
      {queues.isSuccess && queues.data.data.items.length === 0 ? (
        <EmptyState
          title={__t('ui.queue-operations.my_queues_page.aucune_file_configuree_1rf5ow7')}
          description={__t(
            'ui.queue-operations.my_queues_page.ce_site_ne_possede_actuellement_aucune_file_93symj',
          )}
        />
      ) : null}
      {queues.data?.data.items.length ? (
        <Card className="queue-filter-banner">
          <div>
            <h2>{__t('ui.queue-operations.my_queues_page.perimetre_de_la_file_8gpp9p')}</h2>
            <p>
              {__t(
                'ui.queue-operations.my_queues_page.affichez_toutes_les_files_autorisees_ou_concentr_6akqo5',
              )}
            </p>
          </div>
          <div
            className="queue-filter-tabs"
            role="group"
            aria-label={__t('ui.queue-operations.my_queues_page.filtrer_par_file_jg7lak')}
          >
            <button
              className="button"
              type="button"
              aria-pressed={queueId === undefined}
              onClick={() => {
                setQueueId(undefined);
                setPage(1);
              }}
            >
              {__t('ui.queue-operations.my_queues_page.toutes_tin5fo')}
              {queues.data.data.total}
            </button>
            {queues.data.data.items.map((queue) => (
              <button
                className="button"
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
        <DataTable
          caption={__t('ui.queue-operations.my_queues_page.inscriptions_dans_mes_files_1937v4q')}
          rows={items}
          getRowKey={(item) => item.registrationId}
          columns={[
            {
              key: 'position',
              header: 'Position',
              render: (item) => (page - 1) * 10 + items.indexOf(item) + 1,
            },
            {
              key: 'queue',
              header: 'Site / file',
              render: (item) =>
                queues.data.data.items.find((queue) => queue.queueId === item.queueId)?.queueName ??
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
                return <StatusBadge tone="neutral">{item.status}</StatusBadge>;
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
                    setNotesMode(notes[items.indexOf(item)]?.data?.data.total ? 'view' : 'add');
                    setNotesPersonId(item.personId);
                  }}
                >
                  {notes[items.indexOf(item)]?.data?.data.total
                    ? __t(
                        'ui.expression.queue-operations.my_queues_page.voir_ajouter_value0_7sl59g',
                        { value0: String(notes[items.indexOf(item)]?.data?.data.total) },
                      )
                    : __t('ui.expression.queue-operations.my_queues_page.ajouter_17wnmfl')}
                </button>
              ),
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
