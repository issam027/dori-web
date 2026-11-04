import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Megaphone, Plus, Search } from 'lucide-react';
import type {
  AnnouncementResponseDto,
  AnnouncementsControllerListParams,
  CreateAnnouncementDto,
} from '@/api/generated/models';
import { useSessionStore } from '@/core/auth/session-store';
import { useScopeStore } from '@/core/scope/scope-store';
import { isCloudDeployment } from '@/core/config/deployment-mode';
import { hasAnyPermission } from '@/core/permissions/permissions';
import { formatDateTime } from '@/core/i18n/date-format';
import { notify } from '@/core/notifications/notification-store';
import { notifyError } from '@/core/notifications/error-presentation';
import { useSites } from '@/features/portfolio/hooks/useSites';
import { useEdgeInstallations } from '@/features/edge-installations/hooks/useEdgeInstallations';
import { PageHeader } from '@/design-system/components/PageHeader';
import { Button } from '@/design-system/components/Button';
import { Card } from '@/design-system/components/Card';
import { ConfirmDialog, Modal } from '@/design-system/components/Modal';
import { ErrorState } from '@/design-system/components/FeedbackState';
import { DataTable } from '@/design-system/components/DataTable';
import { DataTableMobileCard } from '@/design-system/components/DataTableMobileCard';
import { FilterPanel } from '@/design-system/components/FilterPanel';
import { Pagination } from '@/design-system/components/Pagination';
import { DorifyLoader } from '@/design-system/components/DorifyLoader';
import { RealtimeConnectionIndicator } from '@/core/realtime/RealtimeConnectionIndicator';
import { useDebouncedFilter } from '@/shared/forms/useDebouncedFilter';
import { AnnouncementComposer } from './AnnouncementComposer';
import { AnnouncementDetails } from './AnnouncementDetails';
import { AnnouncementActions } from './AnnouncementActions';
import { AnnouncementSeverity, AnnouncementStatus } from './AnnouncementBadges';
import {
  announcementKeys,
  useAnnouncement,
  useAnnouncements,
  useAnnouncementAdministrationRealtime,
  useWithdrawAnnouncement,
} from './use-announcements';
import './announcements-page.css';

function dateBoundary(value: string, end = false): string | undefined {
  return value ? new Date(value + (end ? 'T23:59:59.999' : 'T00:00:00')).toISOString() : undefined;
}
export function AnnouncementsPage() {
  const { t, i18n } = useTranslation();
  const client = useQueryClient();
  const user = useSessionStore((state) => state.user);
  const activeSiteId = useScopeStore((state) => state.activeSiteId);
  const [params, setParams] = useSearchParams();
  const canSites = hasAnyPermission(user, ['site_edit']);
  const canInstallations =
    isCloudDeployment && hasAnyPermission(user, ['edge_installation_manage']);
  const allowedScopes: CreateAnnouncementDto['scope'][] = [
    ...(canSites ? ['sites' as const] : []),
    ...(canInstallations ? ['installations' as const] : []),
  ];
  const [createScope, setCreateScope] = useState<CreateAnnouncementDto['scope']>(() =>
    params.get('scope') === 'installations' && canInstallations
      ? 'installations'
      : canSites
        ? 'sites'
        : 'installations',
  );
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState('');
  const search = useDebouncedFilter(searchDraft);
  const [status, setStatus] = useState('active');
  const [severity, setSeverity] = useState('');
  const [targetId, setTargetId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] =
    useState<NonNullable<AnnouncementsControllerListParams['sort']>>('createdAt:desc');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [compose, setCompose] = useState(params.get('compose') === '1');
  const [viewing, setViewing] = useState<string>();
  const [editing, setEditing] = useState<string>();
  const [withdrawing, setWithdrawing] = useState<AnnouncementResponseDto>();
  const periodInvalid = Boolean(dateFrom && dateTo && dateFrom > dateTo);
  const query: AnnouncementsControllerListParams = {
    page,
    pageSize: 10,
    sort,
    search: search || undefined,
    status: (status || undefined) as AnnouncementsControllerListParams['status'],
    severity: (severity || undefined) as AnnouncementsControllerListParams['severity'],
    targetId: targetId || undefined,
    dateFrom: dateBoundary(dateFrom),
    dateTo: dateBoundary(dateTo, true),
  };
  const announcements = useAnnouncements(query, !periodInvalid);
  const health = useAnnouncementAdministrationRealtime();
  const withdraw = useWithdrawAnnouncement();
  const needRecipients = filtersOpen || compose;
  const sites = useSites(
    'context-switcher',
    canSites && needRecipients && (filtersOpen || createScope === 'sites'),
  );
  const installations = useEdgeInstallations(
    canInstallations && needRecipients && (filtersOpen || createScope === 'installations'),
  );
  const siteRecipients = (sites.data?.data.items ?? []).map((item) => ({
    id: item.siteId,
    name: item.siteName,
  }));
  const installationRecipients = (installations.data?.data ?? []).map((item) => ({
    id: item.installationId,
    name: item.name,
  }));
  const recipients = createScope === 'sites' ? siteRecipients : installationRecipients;
  const recipientsLoading = createScope === 'sites' ? sites.isPending : installations.isPending;
  const data = announcements.data?.data;
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const formatDate = (value: string) => formatDateTime(value, i18n.language);
  useEffect(() => {
    if (!data) return;
    const observed = Date.parse(data.observedAt);
    const future = data.items
      .filter((item) => item.status !== 'withdrawn')
      .flatMap((item) => [Date.parse(item.startsAt), Date.parse(item.endsAt)])
      .filter((time) => time > observed);
    if (!future.length) return;
    const delay = Math.max(
      10,
      Math.min(...future) - observed - Math.max(0, Date.now() - announcements.dataUpdatedAt) + 10,
    );
    const timer = window.setTimeout(
      () => {
        void client.invalidateQueries({ queryKey: announcementKeys.all });
      },
      Math.min(2147483647, delay),
    );
    return () => {
      window.clearTimeout(timer);
    };
  }, [data, announcements.dataUpdatedAt, client]);
  const closeComposer = () => {
    setCompose(false);
    const next = new URLSearchParams(params);
    next.delete('compose');
    next.delete('targetId');
    setParams(next, { replace: true });
  };
  const targets = (item: AnnouncementResponseDto) => (
    <span
      className="announcement-target-summary"
      title={item.targets.map((target) => target.name).join(' / ')}
    >
      <bdi dir="auto">{item.targets[0]?.name ?? t('common.notProvided')}</bdi>
      {item.targets.length > 1 ? <small> +{item.targets.length - 1}</small> : null}
    </span>
  );
  const actions = (item: AnnouncementResponseDto, mobile = false) => (
    <AnnouncementActions
      item={item}
      mobile={mobile}
      onView={() => {
        setViewing(item.announcementId);
      }}
      onEdit={() => {
        setEditing(item.announcementId);
      }}
      onWithdraw={() => {
        setWithdrawing(item);
      }}
    />
  );
  return (
    <div className="page-stack admin-page announcements-page">
      <PageHeader
        eyebrow={t('nav.administration')}
        title={t('announcements.title')}
        description={t('announcements.description')}
        status={<RealtimeConnectionIndicator health={health} sseOnly />}
        actions={
          <Button
            variant="primary"
            icon={<Plus />}
            label={t('announcements.new')}
            onClick={() => {
              setCompose(true);
            }}
          />
        }
      />
      <FilterPanel
        icon={<Search />}
        title={t('announcements.filtersTitle')}
        description={t('announcements.filtersHint')}
        onOpenChange={setFiltersOpen}
        context={t('announcements.resultCount', { count: total })}
        activeCount={
          Number(Boolean(searchDraft)) +
          Number(status !== 'active') +
          Number(Boolean(severity)) +
          Number(Boolean(targetId)) +
          Number(Boolean(dateFrom)) +
          Number(Boolean(dateTo)) +
          Number(sort !== 'createdAt:desc')
        }
        resetLabel={t('common.reset')}
        onReset={() => {
          setSearchDraft('');
          setStatus('active');
          setSeverity('');
          setTargetId('');
          setDateFrom('');
          setDateTo('');
          setSort('createdAt:desc');
          setPage(1);
        }}
        primary={
          <label>
            {t('common.search')}
            <input
              type="search"
              maxLength={200}
              value={searchDraft}
              placeholder={t('announcements.searchPlaceholder')}
              onChange={(event) => {
                setSearchDraft(event.target.value);
                setPage(1);
              }}
            />
          </label>
        }
      >
        <div className="admin-filter-grid announcement-filter-grid">
          <label>
            {t('common.status')}
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">{t('announcements.allStatuses')}</option>
              {['active', 'scheduled', 'expired', 'withdrawn'].map((value) => (
                <option key={value} value={value}>
                  {t(`announcements.status.${value}`)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('announcements.importance')}
            <select
              value={severity}
              onChange={(event) => {
                setSeverity(event.target.value);
                setPage(1);
              }}
            >
              <option value="">{t('announcements.allSeverities')}</option>
              {['info', 'warning', 'critical'].map((value) => (
                <option key={value} value={value}>
                  {t(`announcements.severity.${value}`)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('announcements.recipients')}
            <select
              value={targetId}
              onChange={(event) => {
                setTargetId(event.target.value);
                setPage(1);
              }}
            >
              <option value="">{t('announcements.allTargets')}</option>
              {canSites ? (
                <optgroup label={t('announcements.scope.sites')}>
                  {siteRecipients.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {canInstallations ? (
                <optgroup label={t('announcements.scope.installations')}>
                  {installationRecipients.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
          </label>
          <label>
            {t('announcements.dateFrom')}
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <label>
            {t('announcements.dateTo')}
            <input
              type="date"
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <label>
            {t('announcements.sort')}
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as typeof sort);
                setPage(1);
              }}
            >
              {[
                'createdAt:desc',
                'createdAt:asc',
                'title:asc',
                'title:desc',
                'startsAt:asc',
                'endsAt:asc',
              ].map((value) => (
                <option key={value} value={value}>
                  {t(`announcements.sort.${value}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {periodInvalid ? (
          <p className="field-error" role="alert">
            {t('announcements.invalidDateFilter')}
          </p>
        ) : null}
      </FilterPanel>
      <Card className="settings-card">
        <div className="card-heading announcement-directory-heading">
          <span className="translation-heading-icon">
            <Megaphone aria-hidden="true" />
          </span>
          <div>
            <h2>{t('announcements.history')}</h2>
            <p>{t('announcements.resultCount', { count: total })}</p>
          </div>
        </div>
        <DataTable
          rows={items}
          getRowKey={(item) => item.announcementId}
          caption={t('announcements.title')}
          loading={announcements.isLoading && !periodInvalid}
          error={announcements.isError}
          onRetry={() => void announcements.refetch()}
          empty={!items.length}
          emptyTitle={t('announcements.empty')}
          emptyDescription={t('announcements.emptyHelp')}
          columns={[
            ...(isCloudDeployment
              ? [
                  {
                    key: 'nature',
                    header: t('announcements.nature'),
                    render: (item: AnnouncementResponseDto) =>
                      t(`announcements.scope.${item.scope}`),
                  },
                ]
              : []),
            {
              key: 'title',
              header: t('announcements.subject'),
              render: (item) => (
                <b className="announcement-title-summary" title={item.title}>
                  <bdi dir="auto">{item.title}</bdi>
                </b>
              ),
            },
            {
              key: 'severity',
              header: t('announcements.importance'),
              render: (item) => <AnnouncementSeverity item={item} />,
            },
            {
              key: 'status',
              header: t('common.status'),
              render: (item) => <AnnouncementStatus item={item} />,
            },
            { key: 'targets', header: t('announcements.recipients'), render: targets },
            {
              key: 'endsAt',
              header: t('announcements.endsAt'),
              render: (item) => <time dateTime={item.endsAt}>{formatDate(item.endsAt)}</time>,
            },
            {
              key: 'actions',
              header: t('common.actions'),
              render: (item) => <div className="table-actions">{actions(item)}</div>,
            },
          ]}
          renderMobileRow={(item) => (
            <DataTableMobileCard
              title={<bdi dir="auto">{item.title}</bdi>}
              badge={<AnnouncementStatus item={item} />}
              fields={[
                ...(isCloudDeployment
                  ? [
                      {
                        label: t('announcements.nature'),
                        value: t(`announcements.scope.${item.scope}`),
                      },
                    ]
                  : []),
                {
                  label: t('announcements.importance'),
                  value: <AnnouncementSeverity item={item} />,
                },
                { label: t('announcements.recipients'), value: targets(item) },
                { label: t('announcements.endsAt'), value: formatDate(item.endsAt), wide: true },
              ]}
              actions={actions(item, true)}
            />
          )}
        />
        <Pagination
          page={page}
          totalPages={Math.max(1, data?.totalPages ?? 1)}
          onPageChange={setPage}
        />
      </Card>
      {compose ? (
        <AnnouncementComposer
          scope={createScope}
          allowedScopes={allowedScopes}
          onScopeChange={setCreateScope}
          recipients={recipients}
          initialTargetId={
            params.get('targetId') ??
            (createScope === 'sites' ? (activeSiteId ?? undefined) : undefined)
          }
          loading={recipientsLoading}
          onClose={closeComposer}
        />
      ) : null}
      {viewing ? (
        <AnnouncementDetails
          id={viewing}
          onClose={() => {
            setViewing(undefined);
          }}
          onEdit={(id) => {
            setViewing(undefined);
            setEditing(id);
          }}
        />
      ) : null}
      {editing ? (
        <AnnouncementEditor
          key={editing}
          id={editing}
          onClose={() => {
            setEditing(undefined);
          }}
        />
      ) : null}
      <ConfirmDialog
        open={Boolean(withdrawing)}
        onOpenChange={(open) => {
          if (!open && !withdraw.isPending) setWithdrawing(undefined);
        }}
        title={t('announcements.withdraw')}
        description={
          <bdi dir="auto">
            {t('announcements.withdrawConfirm', { title: withdrawing?.title ?? '' })}
          </bdi>
        }
        confirmLabel={t('announcements.withdraw')}
        destructive
        pending={withdraw.isPending}
        onConfirm={() => {
          if (withdrawing)
            withdraw.mutate(withdrawing.announcementId, {
              onSuccess: () => {
                notify({ tone: 'success', title: t('announcements.withdrawn') });
                setPage(1);
                setWithdrawing(undefined);
              },
              onError: notifyError,
            });
        }}
      />
    </div>
  );
}
function AnnouncementEditor({ id, onClose }: { id: string; onClose: () => void }) {
  const { t } = useTranslation();
  const detail = useAnnouncement(id);
  const item = detail.data?.data;
  const sites = useSites('context-switcher', item?.scope === 'sites');
  const installations = useEdgeInstallations(item?.scope === 'installations');
  const recipients =
    item?.scope === 'sites'
      ? (sites.data?.data.items ?? []).map((target) => ({
          id: target.siteId,
          name: target.siteName,
        }))
      : (installations.data?.data ?? []).map((target) => ({
          id: target.installationId,
          name: target.name,
        }));
  const loading = item?.scope === 'sites' ? sites.isPending : installations.isPending;
  if (!item || detail.isError || !item.canEdit)
    return (
      <Modal
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        title={t('common.edit')}
      >
        {detail.isError || item ? (
          <ErrorState onRetry={() => void detail.refetch()} />
        ) : (
          <DorifyLoader compact />
        )}
      </Modal>
    );
  const choices = [
    ...new Map(
      [
        ...recipients,
        ...item.targets.map((target) => ({ id: target.targetId, name: target.name })),
      ].map((target) => [target.id, target]),
    ).values(),
  ];
  return (
    <AnnouncementComposer
      scope={item.scope}
      recipients={choices}
      initialAnnouncement={item}
      loading={loading}
      onClose={onClose}
    />
  );
}
