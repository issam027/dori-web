import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import type { AnnouncementResponseDto, CreateAnnouncementDto } from '@/api/generated/models';
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
import { ConfirmDialog } from '@/design-system/components/Modal';
import { EmptyState, ErrorState } from '@/design-system/components/FeedbackState';
import { Pagination } from '@/design-system/components/Pagination';
import { StatusBadge } from '@/design-system/components/StatusBadge';
import { RealtimeConnectionIndicator } from '@/core/realtime/RealtimeConnectionIndicator';
import { AnnouncementComposer } from './AnnouncementComposer';
import {
  announcementKeys,
  useAnnouncements,
  useAnnouncementAdministrationRealtime,
  useWithdrawAnnouncement,
} from './use-announcements';
import './announcements-page.css';

export function AnnouncementsPage() {
  const { t, i18n } = useTranslation();
  const client = useQueryClient();
  const user = useSessionStore((state) => state.user);
  const activeSiteId = useScopeStore((state) => state.activeSiteId);
  const [params, setParams] = useSearchParams();
  const canSites = hasAnyPermission(user, ['site_edit']);
  const canInstallations =
    isCloudDeployment && hasAnyPermission(user, ['edge_installation_manage']);
  const scope: CreateAnnouncementDto['scope'] =
    (params.get('scope') === 'installations' && canInstallations) || !canSites
      ? 'installations'
      : 'sites';
  const [page, setPage] = useState(1);
  const [compose, setCompose] = useState(params.get('compose') === '1');
  const [withdrawing, setWithdrawing] = useState<AnnouncementResponseDto | null>(null);
  const announcements = useAnnouncements(scope, page);
  const health = useAnnouncementAdministrationRealtime();
  const withdraw = useWithdrawAnnouncement();
  const sites = useSites('context-switcher', compose && scope === 'sites');
  const installations = useEdgeInstallations(compose && scope === 'installations');
  const recipients =
    scope === 'sites'
      ? (sites.data?.data.items ?? []).map((item) => ({ id: item.siteId, name: item.siteName }))
      : (installations.data?.data ?? []).map((item) => ({
          id: item.installationId,
          name: item.name,
        }));
  const data = announcements.data?.data;
  // Refresh once at the next visible period boundary, not at a polling interval.
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
        void client.invalidateQueries({ queryKey: announcementKeys.list(scope, page) });
      },
      Math.min(2147483647, delay),
    );
    return () => {
      window.clearTimeout(timer);
    };
  }, [data, announcements.dataUpdatedAt, client, scope, page]);
  const closeComposer = () => {
    setCompose(false);
    const next = new URLSearchParams(params);
    next.delete('compose');
    next.delete('targetId');
    setParams(next, { replace: true });
  };
  if (announcements.isError && !data)
    return <ErrorState onRetry={() => void announcements.refetch()} />;
  return (
    <div className="page-stack announcements-page">
      <PageHeader
        eyebrow={t('nav.announcements')}
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
      {canSites && canInstallations ? (
        <div className="announcement-scopes" role="group" aria-label={t('announcements.audience')}>
          {(['sites', 'installations'] as const).map((value) => (
            <Button
              key={value}
              variant={scope === value ? 'primary' : 'default'}
              aria-pressed={scope === value}
              label={t(`announcements.scope.${value}`)}
              onClick={() => {
                setPage(1);
                setParams({ scope: value });
              }}
            />
          ))}
        </div>
      ) : null}
      <Card>
        <div className="card-heading">
          <div>
            <h2>{t('announcements.history')}</h2>
            <p>
              {t(
                scope === 'installations'
                  ? 'announcements.installationAudience'
                  : 'announcements.siteAudience',
              )}
            </p>
          </div>
          <StatusBadge>{new Intl.NumberFormat(i18n.language).format(data?.total ?? 0)}</StatusBadge>
        </div>
        {!data?.items.length ? (
          <EmptyState title={t('announcements.empty')} description={t('announcements.emptyHelp')} />
        ) : (
          <div className="announcement-history">
            {data.items.map((item) => (
              <article className="announcement-history-row" key={item.announcementId}>
                <div className="announcement-history-heading">
                  <div>
                    <h3>
                      <bdi dir="auto">{item.title}</bdi>
                    </h3>
                    <span className="announcement-row-badges">
                      <StatusBadge
                        tone={
                          item.status === 'active'
                            ? 'success'
                            : item.status === 'scheduled'
                              ? 'warning'
                              : 'neutral'
                        }
                      >
                        {t(`announcements.status.${item.status}`)}
                      </StatusBadge>
                      <StatusBadge
                        tone={
                          item.severity === 'critical'
                            ? 'danger'
                            : item.severity === 'warning'
                              ? 'warning'
                              : 'neutral'
                        }
                      >
                        {t(`announcements.severity.${item.severity}`)}
                      </StatusBadge>
                    </span>
                  </div>
                  {item.canWithdraw && (item.status === 'active' || item.status === 'scheduled') ? (
                    <Button
                      variant="danger"
                      size="small"
                      icon={<Trash2 />}
                      label={t('announcements.withdraw')}
                      onClick={() => {
                        setWithdrawing(item);
                      }}
                    />
                  ) : null}
                </div>
                <p className="announcement-history-message">
                  <bdi dir="auto">{item.message}</bdi>
                </p>
                <p className="announcement-history-targets">
                  <strong>{t(`announcements.scope.${item.scope}`)} : </strong>
                  {item.targets.map((target) => target.name).join(' / ')}
                </p>
                <div className="announcement-history-period">
                  <span>
                    {t('announcements.periodFrom')}{' '}
                    <time dateTime={item.startsAt}>
                      {formatDateTime(item.startsAt, i18n.language)}
                    </time>
                  </span>
                  <span>
                    {t('announcements.periodUntil')}{' '}
                    <time dateTime={item.endsAt}>{formatDateTime(item.endsAt, i18n.language)}</time>
                  </span>
                </div>
                {!item.canWithdraw ? <small>{t('announcements.readOnly')}</small> : null}
              </article>
            ))}
          </div>
        )}
        <Pagination
          page={page}
          totalPages={Math.ceil((data?.total ?? 0) / 10)}
          onPageChange={setPage}
        />
      </Card>
      {compose ? (
        <AnnouncementComposer
          scope={scope}
          recipients={recipients}
          initialTargetId={
            params.get('targetId') ?? (scope === 'sites' ? (activeSiteId ?? undefined) : undefined)
          }
          loading={scope === 'sites' ? sites.isPending : installations.isPending}
          onClose={closeComposer}
        />
      ) : null}
      <ConfirmDialog
        open={Boolean(withdrawing)}
        onOpenChange={(open) => {
          if (!open && !withdraw.isPending) setWithdrawing(null);
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
          if (!withdrawing) return;
          withdraw.mutate(withdrawing.announcementId, {
            onSuccess: () => {
              notify({ tone: 'success', title: t('announcements.withdrawn') });
              setWithdrawing(null);
            },
            onError: notifyError,
          });
        }}
      />
    </div>
  );
}
