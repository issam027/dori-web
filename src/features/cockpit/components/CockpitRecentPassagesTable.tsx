import { useTranslation } from 'react-i18next';
import type { CockpitRecentPassageItemDto, SiteResponseDto } from '@/api/generated/models';
import { Card } from '@/design-system/components/Card';
import { DataTable } from '@/design-system/components/DataTable';
import { DataTableMobileCard } from '@/design-system/components/DataTableMobileCard';
import { StatusBadge } from '@/design-system/components/StatusBadge';
import { formatDateTime } from '@/core/i18n/date-format';
import { CockpitPassagePrintButton } from './CockpitPassagePrintButton';

function dateValue(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function CockpitRecentPassagesTable({
  passages,
  site,
}: {
  passages: readonly CockpitRecentPassageItemDto[];
  site?: SiteResponseDto;
}) {
  const { t, i18n } = useTranslation();
  const outcome = (passage: CockpitRecentPassageItemDto) => (
    <StatusBadge tone={passage.outcome === 'served' ? 'success' : 'warning'}>
      {passage.outcome === 'served' ? t('cockpit.served') : t('cockpit.noShow')}
    </StatusBadge>
  );
  const counter = (passage: CockpitRecentPassageItemDto) =>
    passage.counterName ??
    (passage.threadNumber ? t('cockpit.counterNumber', { number: passage.threadNumber }) : '—');
  const closedAt = (passage: CockpitRecentPassageItemDto) =>
    formatDateTime(dateValue(passage.closedAt), i18n.language) ?? '—';
  const print = (passage: CockpitRecentPassageItemDto) =>
    site ? (
      <CockpitPassagePrintButton passage={passage} site={site} label={t('cockpit.printPassage')} />
    ) : null;

  return (
    <Card>
      <DataTable
        caption={t('cockpit.recentPassages')}
        rows={passages}
        getRowKey={(passage) => passage.registrationId}
        empty={passages.length === 0}
        emptyTitle={t('cockpit.noRecentPassages')}
        emptyDescription={t('cockpit.noRecentPassagesHint')}
        renderMobileRow={(passage) => (
          <DataTableMobileCard
            title={passage.ticketNumber}
            subtitle={passage.personName}
            badge={outcome(passage)}
            fields={[
              { label: t('queues.singular'), value: passage.queueName },
              { label: t('desk.counterName'), value: counter(passage) },
              { label: t('common.date'), value: closedAt(passage), wide: true },
            ]}
            actions={print(passage)}
          />
        )}
        columns={[
          {
            key: 'ticket',
            header: t('common.ticket'),
            render: (passage) => <strong>{passage.ticketNumber}</strong>,
          },
          { key: 'person', header: t('common.person'), render: (passage) => passage.personName },
          { key: 'queue', header: t('queues.singular'), render: (passage) => passage.queueName },
          { key: 'counter', header: t('desk.counterName'), render: counter },
          { key: 'outcome', header: t('cockpit.historyOutcome'), render: outcome },
          { key: 'closedAt', header: t('common.date'), render: closedAt },
          { key: 'actions', header: t('common.actions'), render: print },
        ]}
      />
    </Card>
  );
}
