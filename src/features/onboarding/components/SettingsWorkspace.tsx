import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers3, ListTree, Pencil, Plus, Power, PowerOff, UserMinus, UserPlus } from 'lucide-react';
import { sitesControllerRemoveManager } from '@/api/generated/sites/sites';
import type { SiteManagerResponseDto } from '@/api/generated/models';
import { createQueueForSite, updateQueue, updateSite } from '../api/onboarding-api';
import type { findSites, findTiers } from '../api/onboarding-api';
import type { QueueResponseDto } from '@/api/generated/models';
import { useScopeStore } from '@/core/scope/scope-store';
import { useSessionStore } from '@/core/auth/session-store';
import { hasPermission } from '@/core/permissions/permissions';
import { Card, MetricCard } from '@/design-system/components/Card';
import { PageHeader } from '@/design-system/components/PageHeader';
import { Pagination } from '@/design-system/components/Pagination';
import { QueueEditor } from '@/features/queues/QueueEditor';
import { type AssignmentTarget, UserAssignmentModal } from '@/features/users/UserAssignmentModal';
import { QueueOperatorsModal } from '@/features/users/QueueOperatorsModal';

import { type SettingsSection } from '../settings-routes';
import { useSettingsData } from '../hooks/useSettingsData';
import { SettingsNavigation } from './SettingsNavigation';
import { QueueServiceSettings } from './QueueServiceSettings';

export function SettingsWorkspace({ section }: { section: SettingsSection }) {
  const { t: __t } = useTranslation();
  const activeSiteId = useScopeStore((s) => s.activeSiteId);
  const [queueStatus, setQueueStatus] = useState<'active' | 'inactive' | 'all'>('active');
  const {
    sites: ss,
    queues: qs,
    roles: rs,
    tiers: ts,
    managers,
    refreshManagers,
    refresh: refreshData,
  } = useSettingsData(activeSiteId, queueStatus);
  const refresh = () => { void Promise.all([refreshData(), refreshManagers()]); };
  const [queueOpen, setQueueOpen] = useState(false),
    [editQueue, setEditQueue] = useState<QueueResponseDto>(),
    [assignmentTarget, setAssignmentTarget] = useState<AssignmentTarget | null>(null),
    [operatorsQueue, setOperatorsQueue] = useState<QueueResponseDto | null>(null);
  return (
    <div className="page-stack admin-page">
      <PageHeader
        eyebrow={__t('nav.administration')}
        title={__t('onboarding.settings.configurationDuService')}
        description={__t('onboarding.settings.gerezLesRessourcesReellementProposeesParDo')}
      />
      <div className="metrics-grid">
        <MetricCard
          label={__t('onboarding.settings.filesConfigurees')}
          value={qs.length}
          icon={<ListTree />}
        />
        <MetricCard
          label={__t('onboarding.settings.niveaux')}
          value={ts.length}
          icon={<Layers3 />}
        />
      </div>
      <Card className="settings-card">
        <SettingsNavigation active={section} />
        {section === 'sites' ? (
          <SitesPanel items={ss.filter((site) => site.siteId === activeSiteId)} managers={managers} refresh={refresh} assign={setAssignmentTarget} />
        ) : null}
        {section === 'queues' ? (
          <QueuesPanel
            items={qs}
            status={queueStatus}
            onStatusChange={setQueueStatus}
            create={() => {
              setEditQueue(undefined);
              setQueueOpen(true);
            }}
            edit={(q) => {
              setEditQueue(q);
              setQueueOpen(true);
            }}
            refresh={refresh}
            manageOperators={setOperatorsQueue}
          />
        ) : null}
        {section === 'tiers' ? <TiersPanel queues={qs} tiers={ts} /> : null}
      </Card>
      <QueueEditor
        key={editQueue?.queueId ?? 'new'}
        open={queueOpen}
        onOpenChange={setQueueOpen}
        initial={editQueue}
        onSave={async (v) => {
          if (editQueue) await updateQueue(editQueue.queueId, v);
          else if (activeSiteId) await createQueueForSite(activeSiteId, v);
          refresh();
        }}
      />
      <UserAssignmentModal
        target={assignmentTarget}
        roles={rs}
        onOpenChange={(open) => {
          if (!open) setAssignmentTarget(null);
        }}
        onAssigned={refresh}
      />
      <QueueOperatorsModal queue={operatorsQueue} onOpenChange={(open) => { if (!open) setOperatorsQueue(null); }} />
    </div>
  );
}

function Header({
  title,
  text,
  action,
  label,
  to,
}: {
  title: string;
  text: string;
  action?: () => void;
  label?: string;
  to?: string;
}) {
  return (
    <div className="card-heading">
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      {to && label ? (
        <Link className="button button-primary" to={to}>
          <Plus aria-hidden="true" /> {label}
        </Link>
      ) : action ? (
        <button className="button button-primary" onClick={action}>
          <Plus aria-hidden="true" /> {label}
        </button>
      ) : null}
    </div>
  );
}
type Sites = Awaited<ReturnType<typeof findSites>>['data']['items'];
type Tiers = Awaited<ReturnType<typeof findTiers>>['data']['items'];
const ADMIN_PAGE_SIZE = 10;

function useAdminPagination<T>(items: readonly T[]) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / ADMIN_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = items.slice((currentPage - 1) * ADMIN_PAGE_SIZE, currentPage * ADMIN_PAGE_SIZE);
  return { currentPage, pageItems, setPage, totalPages };
}

function SitesPanel({
  items,
  managers,
  refresh,
  assign,
}: {
  items: Sites;
  managers: SiteManagerResponseDto[];
  refresh: () => void;
  assign: (target: AssignmentTarget) => void;
}) {
  const { t: __t } = useTranslation();
  const pagination = useAdminPagination(items);
  return (
    <section>
      <Header
        title={__t('onboarding.settings.sitesManagers')}
        text={__t('settings.siteHelp')}
      />
      <div className="table-wrap admin-table-wrap">
        <table>
          <thead>
            <tr>
              <th>{__t('sites.singular')}</th>
              <th>{__t('common.localisation')}</th>
              <th>{__t('onboarding.settings.fuseau')}</th>
              <th>{__t('common.devise')}</th>
              <th>{__t('common.etat')}</th>
              <th>{__t('onboarding.settings.action')}</th>
            </tr>
          </thead>
          <tbody>
            {pagination.pageItems.map((s) => (
              <tr key={s.siteId}>
                <td>
                  <b>{s.siteName}</b>
                  <small>
                    {s.siteType} · {s.defaultLocale}
                  </small>
                </td>
                <td>{s.siteLocation ?? '—'}</td>
                <td>{s.timezone}</td>
                <td>{s.defaultCurrency}</td>
                <td>
                  <span className={`status-badge ${s.isActive ? 'status-success' : ''}`}>
                    {s.isActive ? __t('common.active') : __t('common.inactive')}
                  </span>
                </td>
                <td>
                  <div className="table-actions responsive-table-actions">
                    <button
                      className="button button-small"
                      type="button"
                      title={__t('settings.assignUser')}
                      onClick={() => {
                        assign({ kind: 'site', id: s.siteId, label: s.siteName });
                      }}
                    >
                      <UserPlus aria-hidden="true" />
                      {__t('settings.assignUser')}
                    </button>
                    <button
                      className="button button-small"
                      title={
                        s.isActive ? __t('onboarding.settings.desactiver') : __t('common.activate')
                      }
                      onClick={() =>
                        void updateSite(s.siteId, { isActive: !s.isActive }).then(refresh)
                      }
                    >
                      {s.isActive ? <PowerOff aria-hidden="true" /> : <Power aria-hidden="true" />}
                      {s.isActive ? __t('onboarding.settings.desactiver') : __t('common.activate')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {items[0] ? (
        <Card className="site-managers-card">
          <div className="card-heading">
            <div><h3>{__t('settings.managers')}</h3><p>{__t('settings.managersHelp')}</p></div>
            <button className="button button-primary" type="button" onClick={() => { const site = items[0]; if (site) assign({ kind: 'site', id: site.siteId, label: site.siteName }); }}><UserPlus />{__t('settings.addManager')}</button>
          </div>
          {managers.length ? <ul className="manager-list">{managers.map((manager) => <li key={manager.userId}><div><strong>{manager.username}</strong><span>{manager.email}</span></div><span className={`status-badge ${manager.isActive ? 'status-success' : ''}`}>{manager.isActive ? __t('common.active') : __t('common.inactive')}</span><button className="button button-small button-danger" type="button" onClick={() => { const site = items[0]; if (site) void sitesControllerRemoveManager(site.siteId, manager.userId).then(refresh); }}><UserMinus />{__t('settings.removeManager')}</button></li>)}</ul> : <p className="muted">{__t('settings.noManagers')}</p>}
        </Card>
      ) : null}
      {items.length > ADMIN_PAGE_SIZE ? (
        <Pagination
          page={pagination.currentPage}
          totalPages={pagination.totalPages}
          onPageChange={pagination.setPage}
        />
      ) : null}
    </section>
  );
}
function QueuesPanel({
  items,
  status,
  onStatusChange,
  create,
  edit,
  refresh,
  manageOperators,
}: {
  items: QueueResponseDto[];
  status: 'active' | 'inactive' | 'all';
  onStatusChange: (status: 'active' | 'inactive' | 'all') => void;
  create: () => void;
  edit: (q: QueueResponseDto) => void;
  refresh: () => void;
  manageOperators: (queue: QueueResponseDto) => void;
}) {
  const { t: __t } = useTranslation();
  const canAssignOperators = hasPermission(useSessionStore((state) => state.user), 'user_queue_assign');
  const pagination = useAdminPagination(items);
  return (
    <section>
      <Header
        title={__t('onboarding.settings.filesDAttente')}
        text={__t('settings.queuesHelp')}
        action={create}
        label={__t('onboarding.settings.nouvelleFile')}
      />
      <Card className="portfolio-filter-card settings-queue-filter">
        <div>
          <strong>{__t('settings.displayQueues')}</strong>
          <small>{__t('settings.queueFiltersHelp')}</small>
        </div>
        <div
          className="portfolio-status-filter"
          role="group"
          aria-label={__t('settings.displayQueues')}
        >
          {(
            [
              ['active', __t('common.active')],
              ['inactive', __t('common.inactive')],
              ['all', __t('common.all')],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={status === value ? 'is-active' : ''}
              aria-pressed={status === value}
              onClick={() => {
                onStatusChange(value);
                pagination.setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>
      <div className="table-wrap admin-table-wrap">
        <table>
          <thead>
            <tr>
              <th>{__t('queues.singular')}</th>
              <th>{__t('common.guichets')}</th>
              <th>{__t('common.rdv')}</th>
              <th>{__t('common.deviseLocale')}</th>
              <th>{__t('onboarding.settings.origines')}</th>
              <th>{__t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {pagination.pageItems.map((q) => (
              <tr key={q.queueId}>
                <td>
                  <b>
                    {q.queueCode} · {q.queueName}
                  </b>
                  <small>
                    {q.averageWaitTime} {__t('common.min')}
                  </small>
                </td>
                <td>{q.threadCount}</td>
                <td>{q.appointmentsEnabled ? __t('common.actives') : __t('common.desactives')}</td>
                <td>
                  {q.currency} · {q.locale}
                </td>
                <td>
                  <span className="status-badge status-info">
                    {Object.values(q.configOrigins).filter((v) => v === 'site').length}{' '}
                    {__t('onboarding.settings.herites')}
                  </span>
                </td>
                <td>
                  <div className="table-actions responsive-table-actions">
                    <button
                      className="button button-small"
                      title={__t('common.edit')}
                      onClick={() => {
                        edit(q);
                      }}
                    >
                      <Pencil aria-hidden="true" />
                      {__t('common.edit')}
                    </button>

                    {canAssignOperators ? <button
                      className="button button-small"
                      type="button"
                      title={__t('settings.queueOperators.title')}
                      onClick={() => {
                        manageOperators(q);
                      }}
                    >
                      <UserPlus aria-hidden="true" />
                      {__t('settings.queueOperators.button')}
                    </button> : null}
                    <button
                      className="button button-small"
                      title={
                        q.isActive ? __t('onboarding.settings.desactiver') : __t('common.activate')
                      }
                      onClick={() =>
                        void updateQueue(q.queueId, { isActive: !q.isActive }).then(refresh)
                      }
                    >
                      {q.isActive ? <PowerOff aria-hidden="true" /> : <Power aria-hidden="true" />}
                      {q.isActive ? __t('onboarding.settings.desactiver') : __t('common.activate')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {items.length > ADMIN_PAGE_SIZE ? (
        <Pagination
          page={pagination.currentPage}
          totalPages={pagination.totalPages}
          onPageChange={pagination.setPage}
        />
      ) : null}
    </section>
  );
}
function TiersPanel({ queues, tiers }: { queues: QueueResponseDto[]; tiers: Tiers }) {
  const { t: __t } = useTranslation();
  return (
    <section>
      <Header title={__t('common.niveauxDeService')} text={__t('settings.tiersHelp')} />
      <QueueServiceSettings queues={queues} tiers={tiers} />
    </section>
  );
}
