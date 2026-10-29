import { useState } from 'react';
import { Eye, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AuditControllerSearchOutcome } from '@/api/generated/models';
import { formatDateTime } from '@/core/i18n/date-format';
import { useDebouncedFilter } from '@/shared/forms/useDebouncedFilter';
import { Button } from '@/design-system/components/Button';
import { Card } from '@/design-system/components/Card';
import { DataTable } from '@/design-system/components/DataTable';
import { EmptyState, ErrorState } from '@/design-system/components/FeedbackState';
import { Modal } from '@/design-system/components/Modal';
import { PageHeader } from '@/design-system/components/PageHeader';
import { Pagination } from '@/design-system/components/Pagination';
import { StatusBadge } from '@/design-system/components/StatusBadge';
import { AuditEventDetail } from './AuditEventDetail';
import { AuditEventMobileCard } from './AuditEventMobileCard';
import { useAuditEvent, useAuditEvents } from './hooks/useAudit';
import { FilterPanel } from '@/design-system/components/FilterPanel';
import { SEARCH_MINIMUM_LENGTH } from '@/shared/forms/search-config';
import './audit.css';

export function AuditPage() {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedFilter(search, { delay: 350 });
  const [actorUserId, setActorUserId] = useState('');
  const [action, setAction] = useState('');
  const [targetType, setTargetType] = useState('');
  const [outcome, setOutcome] = useState<AuditControllerSearchOutcome | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [detailId, setDetailId] = useState<string>();

  const journal = useAuditEvents({
    page,
    search: debouncedSearch.length >= SEARCH_MINIMUM_LENGTH ? debouncedSearch : undefined,
    actorUserId: actorUserId || undefined,
    action: action || undefined,
    targetType: targetType || undefined,
    outcome: outcome || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });
  const detail = useAuditEvent(detailId);
  const data = journal.data?.data;
  const items = data?.items ?? [];

  const reset = () => {
    setSearch('');
    setActorUserId('');
    setAction('');
    setTargetType('');
    setOutcome('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  return (
    <div className="page-stack admin-page audit-page">
      <PageHeader
        eyebrow={t('audit.eyebrow')}
        title={t('audit.title')}
        description={t('audit.description')}
      />
      <FilterPanel
        icon={<Search />}
        title={t('audit.filters.title')}
        description={t('audit.filters.help')}
        activeCount={
          [search, actorUserId, action, targetType, outcome, dateFrom, dateTo].filter(Boolean)
            .length
        }
        resetLabel={t('common.reset')}
        onReset={reset}
      >
        <div className="admin-filter-grid">
          <label>
            {t('audit.filters.search')}
            <input
              value={search}
              maxLength={100}
              placeholder={t('audit.filters.searchPlaceholder')}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <label>
            {t('audit.fields.actorId')}
            <input
              type="number"
              min="1"
              value={actorUserId}
              onChange={(event) => {
                setActorUserId(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <label>
            {t('audit.fields.action')}
            <input
              value={action}
              maxLength={100}
              onChange={(event) => {
                setAction(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <label>
            {t('audit.fields.targetType')}
            <input
              value={targetType}
              maxLength={50}
              onChange={(event) => {
                setTargetType(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <label>
            {t('audit.fields.outcome')}
            <select
              value={outcome}
              onChange={(event) => {
                setOutcome(event.target.value as AuditControllerSearchOutcome | '');
                setPage(1);
              }}
            >
              <option value="">{t('common.all')}</option>
              <option value="success">{t('audit.outcomes.success')}</option>
              <option value="failure">{t('audit.outcomes.failure')}</option>
            </select>
          </label>
          <label>
            {t('audit.filters.dateFrom')}
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(event) => {
                setDateFrom(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <label>
            {t('audit.filters.dateTo')}
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(event) => {
                setDateTo(event.target.value);
                setPage(1);
              }}
            />
          </label>
        </div>
      </FilterPanel>
      <Card className="settings-card">
        {journal.isError ? <ErrorState onRetry={() => void journal.refetch()} /> : null}
        {journal.isSuccess && items.length === 0 ? (
          <EmptyState title={t('audit.empty.title')} description={t('audit.empty.description')} />
        ) : null}
        {journal.isPending || items.length > 0 ? (
          <>
            <DataTable
              loading={journal.isPending}
              caption={t('audit.table.caption')}
              rows={items}
              getRowKey={(row) => row.eventId}
              renderMobileRow={(row) => (
                <AuditEventMobileCard
                  event={row}
                  occurredAt={formatDateTime(row.occurredAt, i18n.language) ?? '—'}
                  onView={() => {
                    setDetailId(row.eventId);
                  }}
                />
              )}
              columns={[
                {
                  key: 'date',
                  header: t('audit.fields.date'),
                  render: (row) => formatDateTime(row.occurredAt, i18n.language) ?? '—',
                },
                {
                  key: 'actor',
                  header: t('audit.fields.actor'),
                  render: (row) => row.actorDisplayName ?? t('audit.systemActor'),
                },
                { key: 'action', header: t('audit.fields.action'), render: (row) => row.action },
                {
                  key: 'target',
                  header: t('audit.fields.target'),
                  render: (row) =>
                    row.targetDisplayName ?? `${row.targetType} · ${row.targetId ?? '—'}`,
                },
                {
                  key: 'outcome',
                  header: t('audit.fields.outcome'),
                  render: (row) => (
                    <StatusBadge tone={row.outcome === 'success' ? 'success' : 'danger'}>
                      {t(`audit.outcomes.${row.outcome}`)}
                    </StatusBadge>
                  ),
                },
                {
                  key: 'actions',
                  header: t('common.actions'),
                  render: (row) => (
                    <div className="table-actions responsive-table-actions">
                      <Button
                        variant="unstyled"
                        className="button button-small"
                        type="button"
                        title={t('audit.actions.view')}
                        onClick={() => {
                          setDetailId(row.eventId);
                        }}
                      >
                        <Eye aria-hidden="true" />
                        {t('audit.actions.view')}
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
            <Pagination
              page={data?.page ?? page}
              totalPages={Math.max(1, data?.totalPages ?? 1)}
              onPageChange={setPage}
            />
          </>
        ) : null}
      </Card>
      <Modal
        loading={detail.isPending}
        className="audit-detail-dialog"
        open={detailId !== undefined}
        onOpenChange={(open) => {
          if (!open) setDetailId(undefined);
        }}
        title={t('audit.detail.title')}
        description={detailId ? t('audit.detail.eventReference', { id: detailId }) : undefined}
      >
        {detail.isError ? <ErrorState onRetry={() => void detail.refetch()} /> : null}
        {detail.data?.data ? <AuditEventDetail event={detail.data.data} /> : null}
      </Modal>
    </div>
  );
}
