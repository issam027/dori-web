import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  associateTier,
  createQueueForSite,
  createTierRule,
  createTranslation,
  findQueues,
  findRoles,
  findSites,
  findTiers,
  findTranslations,
  findUsers,
  logoutUserSessions,
  setUserPassword,
  updateQueue,
  updateSite,
  updateUserStatus,
} from './api/onboarding-api';
import type { QueueResponseDto } from '@/api/generated/models';
import { useScopeStore } from '@/core/scope/scope-store';
import { useSessionStore } from '@/core/auth/session-store';
import { Card, MetricCard } from '@/design-system/components/Card';
import { PageHeader } from '@/design-system/components/PageHeader';
import { Modal } from '@/design-system/components/Modal';
import { Pagination } from '@/design-system/components/Pagination';
import { QueueEditor } from '@/features/queues/QueueEditor';
import { UserAccountWizard } from '@/features/users/UserAccountWizard';
import { queryKeys } from '@/api/client/query-keys';
import { invalidateAdmin } from '@/api/client/query-invalidations';
import {
  type AssignmentTarget,
  UserAssignmentModal,
} from '@/features/users/UserAssignmentModal';
import { notifyError } from '@/core/notifications/error-presentation';
import { notify } from '@/core/notifications/notification-store';

const sections = ['sites', 'queues', 'users', 'tiers', 'notifications', 'translations'] as const;
type Section = (typeof sections)[number];
export function SettingsPage() {
  const { t: __t, i18n } = useTranslation();
  const location = useLocation(),
    qc = useQueryClient(),
    siteId = useScopeStore((s) => s.activeSiteId),
    current = useSessionStore((s) => s.user);
  const suffix = location.pathname.split('/')[2] as Section;
  const section = sections.includes(suffix) ? suffix : 'sites';
  const sites = useQuery({
      queryKey: queryKeys.admin.sites,
      queryFn: () => findSites({ page: 1, pageSize: 100 }),
    }),
    queues = useQuery({
      queryKey: queryKeys.admin.queues(siteId),
      queryFn: () =>
        findQueues({ page: 1, pageSize: 100, siteId: siteId ?? undefined }),
      enabled: Boolean(siteId),
    }),
    users = useQuery({
      queryKey: queryKeys.admin.users,
      queryFn: () => findUsers({ page: 1, pageSize: 100 }),
    }),
    roles = useQuery({
      queryKey: queryKeys.admin.roles,
      queryFn: () => findRoles({ page: 1, pageSize: 100 }),
    }),
    tiers = useQuery({
      queryKey: queryKeys.admin.tiers,
      queryFn: () => findTiers({ page: 1, pageSize: 100 }),
    }),
    translations = useQuery({
      queryKey: queryKeys.admin.translations(i18n.resolvedLanguage ?? i18n.language),
      queryFn: () => findTranslations({ page: 1, pageSize: 100 }),
    });
  const ss = sites.data?.data.items ?? [],
    qs = queues.data?.data.items ?? [],
    us = users.data?.data.items ?? [],
    rs = roles.data?.data.items ?? [],
    ts = tiers.data?.data.items ?? [],
    xs = translations.data?.data.items ?? [];
  const refresh = () => void invalidateAdmin(qc);
  const [queueOpen, setQueueOpen] = useState(false),
    [editQueue, setEditQueue] = useState<QueueResponseDto>(),
    [userOpen, setUserOpen] = useState(false),
    [tierOpen, setTierOpen] = useState(false),
    [ruleOpen, setRuleOpen] = useState(false),
    [translationOpen, setTranslationOpen] = useState(false),
    [assignmentTarget, setAssignmentTarget] = useState<AssignmentTarget | null>(null);
  const rank = Math.max(
    ...rs.filter((r) => current?.roles.includes(r.roleName)).map((r) => r.rank),
    0,
  );
  return (
    <div className="page-stack admin-page">
      <PageHeader
        eyebrow="Administration"
        title={__t('ui.onboarding.settings_page.configuration_du_service_s0tb4b')}
        description={__t(
          'ui.onboarding.settings_page.gerez_les_ressources_reellement_proposees_par_do_1l33rzi',
        )}
        actions={
          <span className="status-badge status-success">
            {__t('ui.onboarding.settings_page.scope_1kyj8sx')}
            {ss.find((s) => s.siteId === siteId)?.siteName ??
              __t('ui.expression.onboarding.settings_page.global_8bmg8e')}
          </span>
        }
      />
      <div className="metrics-grid">
        <MetricCard
          label={__t('ui.onboarding.settings_page.files_configurees_j0ags4')}
          value={qs.length}
        />
        <MetricCard
          label={__t('ui.onboarding.settings_page.utilisateurs_actifs_gbz8z7')}
          value={us.filter((u) => u.isActive).length}
        />
        <MetricCard label={__t('ui.onboarding.settings_page.niveaux_xbb935')} value={ts.length} />
        <MetricCard
          label={__t('ui.onboarding.settings_page.traductions_t3vhxl')}
          value={xs.length}
        />
      </div>
      <Card className="settings-card">
        <nav className="admin-tabs">
          {sections.map((x) => (
            <Link className={section === x ? 'active' : ''} to={`/settings/${x}`} key={x}>
              {x === 'queues'
                ? __t('ui.expression.onboarding.settings_page.files_1s4j38w')
                : x.charAt(0).toUpperCase() + x.slice(1)}
            </Link>
          ))}
        </nav>
        {section === 'sites' ? (
          <SitesPanel items={ss} refresh={refresh} assign={setAssignmentTarget} />
        ) : null}
        {section === 'queues' ? (
          <QueuesPanel
            items={qs}
            create={() => {
              setEditQueue(undefined);
              setQueueOpen(true);
            }}
            edit={(q) => {
              setEditQueue(q);
              setQueueOpen(true);
            }}
            refresh={refresh}
            assign={setAssignmentTarget}
          />
        ) : null}
        {section === 'users' ? (
          <UsersPanel
            items={us}
            create={() => {
              setUserOpen(true);
            }}
            refresh={refresh}
          />
        ) : null}
        {section === 'tiers' ? (
          <TiersPanel
            items={ts}
            open={() => {
              setTierOpen(true);
            }}
          />
        ) : null}
        {section === 'notifications' ? (
          <NotificationsPanel
            open={() => {
              setRuleOpen(true);
            }}
          />
        ) : null}
        {section === 'translations' ? (
          <TranslationsPanel
            items={xs}
            open={() => {
              setTranslationOpen(true);
            }}
          />
        ) : null}
      </Card>
      <QueueEditor
        key={editQueue?.queueId ?? 'new'}
        open={queueOpen}
        onOpenChange={setQueueOpen}
        initial={editQueue}
        onSave={async (v) => {
          if (editQueue) await updateQueue(editQueue.queueId, v);
          else if (siteId) await createQueueForSite(siteId, v);
          refresh();
        }}
      />
      <UserAccountWizard
        open={userOpen}
        onOpenChange={setUserOpen}
        roles={rs}
        sites={ss}
        queues={qs}
        currentRoleRank={rank}
        onCreated={refresh}
      />
      <TierModal open={tierOpen} close={setTierOpen} queues={qs} tiers={ts} refresh={refresh} />
      <RuleModal open={ruleOpen} close={setRuleOpen} queues={qs} tiers={ts} refresh={refresh} />
      <TranslationModal open={translationOpen} close={setTranslationOpen} refresh={refresh} />
      <UserAssignmentModal
        target={assignmentTarget}
        roles={rs}
        onOpenChange={(open) => {
          if (!open) setAssignmentTarget(null);
        }}
        onAssigned={refresh}
      />
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
          + {label}
        </Link>
      ) : action ? (
        <button className="button button-primary" onClick={action}>
          + {label}
        </button>
      ) : null}
    </div>
  );
}
type Sites = Awaited<ReturnType<typeof findSites>>['data']['items'];
type Users = Awaited<ReturnType<typeof findUsers>>['data']['items'];
type Tiers = Awaited<ReturnType<typeof findTiers>>['data']['items'];
type Translations = Awaited<
  ReturnType<typeof findTranslations>
>['data']['items'];
const ADMIN_PAGE_SIZE = 10;

function useAdminPagination<T>(items: readonly T[]) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / ADMIN_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = items.slice(
    (currentPage - 1) * ADMIN_PAGE_SIZE,
    currentPage * ADMIN_PAGE_SIZE,
  );
  return { currentPage, pageItems, setPage, totalPages };
}

function SitesPanel({
  items,
  refresh,
  assign,
}: {
  items: Sites;
  refresh: () => void;
  assign: (target: AssignmentTarget) => void;
}) {
  const { t: __t } = useTranslation();
  const pagination = useAdminPagination(items);
  return (
    <section>
      <Header
        title={__t('ui.onboarding.settings_page.sites_managers_1qepn57')}
        text={__t('settings.siteHelp')}
        to="/onboarding"
        label={__t('settings.newSite')}
      />
      <div className="table-wrap admin-table-wrap">
        <table>
          <thead>
            <tr>
              <th>{__t('ui.onboarding.settings_page.site_1fo419q')}</th>
              <th>{__t('ui.onboarding.settings_page.localisation_17ojrsd')}</th>
              <th>{__t('ui.onboarding.settings_page.fuseau_djtg02')}</th>
              <th>{__t('ui.onboarding.settings_page.devise_1pl1r6r')}</th>
              <th>{__t('ui.onboarding.settings_page.etat_525179')}</th>
              <th>{__t('ui.onboarding.settings_page.action_2wk0tb')}</th>
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
                    {s.isActive
                      ? __t('ui.expression.onboarding.settings_page.actif_1410gao')
                      : __t('ui.expression.onboarding.settings_page.inactif_11hqnbx')}
                  </span>
                </td>
                <td>
                  <div className="table-actions">
                    <button
                      className="button button-small"
                      type="button"
                      onClick={() => {
                        assign({ kind: 'site', id: s.siteId, label: s.siteName });
                      }}
                    >
                      {__t('settings.assignUser')}
                    </button>
                    <button
                      className="button button-small"
                      onClick={() =>
                        void updateSite(s.siteId, { isActive: !s.isActive }).then(
                          refresh,
                        )
                      }
                    >
                      {s.isActive
                        ? __t('ui.expression.onboarding.settings_page.desactiver_1hfjss1')
                        : __t('ui.expression.onboarding.settings_page.activer_1qnbdon')}
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
function QueuesPanel({
  items,
  create,
  edit,
  refresh,
  assign,
}: {
  items: QueueResponseDto[];
  create: () => void;
  edit: (q: QueueResponseDto) => void;
  refresh: () => void;
  assign: (target: AssignmentTarget) => void;
}) {
  const { t: __t } = useTranslation();
  const pagination = useAdminPagination(items);
  return (
    <section>
      <Header
        title={__t('ui.onboarding.settings_page.files_d_attente_162zjyu')}
        text={__t('settings.queuesHelp')}
        action={create}
        label={__t('ui.onboarding.settings_page.nouvelle_file_1sg2isf')}
      />
      <div className="table-wrap admin-table-wrap">
        <table>
          <thead>
            <tr>
              <th>{__t('ui.onboarding.settings_page.file_bygjtv')}</th>
              <th>{__t('ui.onboarding.settings_page.guichets_j0id8z')}</th>
              <th>{__t('ui.onboarding.settings_page.rdv_1f03hpr')}</th>
              <th>{__t('ui.onboarding.settings_page.devise_locale_ltzxp4')}</th>
              <th>{__t('ui.onboarding.settings_page.origines_1gpe3sn')}</th>
              <th>{__t('ui.onboarding.settings_page.actions_1rx51qc')}</th>
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
                    {q.averageWaitTime} {__t('ui.onboarding.settings_page.min_1jxbmtz')}
                  </small>
                </td>
                <td>{q.threadCount}</td>
                <td>
                  {q.appointmentsEnabled
                    ? __t('ui.expression.onboarding.settings_page.actives_1ntg7nc')
                    : __t('ui.expression.onboarding.settings_page.desactives_1jqymmi')}
                </td>
                <td>
                  {q.currency} · {q.locale}
                </td>
                <td>
                  <span className="status-badge status-info">
                    {Object.values(q.configOrigins).filter((v) => v === 'site').length}{' '}
                    {__t('ui.onboarding.settings_page.herites_17zxgud')}
                  </span>
                </td>
                <td>
                  <div className="table-actions">
                    <button
                      className="button button-small"
                      onClick={() => {
                        edit(q);
                      }}
                    >
                      {__t('ui.onboarding.settings_page.modifier_1s45w8g')}
                    </button>
                    <button
                      className="button button-small"
                      type="button"
                      onClick={() => {
                        assign({ kind: 'queue', id: q.queueId, label: q.queueName });
                      }}
                    >
                      {__t('settings.assignUser')}
                    </button>
                    <button
                      className="button button-small"
                      onClick={() =>
                        void updateQueue(q.queueId, { isActive: !q.isActive }).then(
                          refresh,
                        )
                      }
                    >
                      {q.isActive
                        ? __t('ui.expression.onboarding.settings_page.desactiver_1hfjss1')
                        : __t('ui.expression.onboarding.settings_page.activer_1qnbdon')}
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
function UsersPanel({
  items,
  create,
  refresh,
}: {
  items: Users;
  create: () => void;
  refresh: () => void;
}) {
  const { t: __t } = useTranslation();
  const pagination = useAdminPagination(items);
  const [disconnectUser, setDisconnectUser] = useState<Users[number] | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  return (
    <section>
      <Header
        title={__t('ui.onboarding.settings_page.utilisateurs_roles_1pyrwap')}
        text={__t('settings.usersHelp')}
        action={create}
        label={__t('ui.onboarding.settings_page.nouvel_utilisateur_137bxy3')}
      />
      <div className="table-wrap admin-table-wrap">
        <table>
          <thead>
            <tr>
              <th>{__t('ui.onboarding.settings_page.utilisateur_167aq1s')}</th>
              <th>{__t('ui.onboarding.settings_page.type_1m2zofh')}</th>
              <th>{__t('ui.onboarding.settings_page.roles_1wl5wa9')}</th>
              <th>{__t('ui.onboarding.settings_page.scope_rpvfkb')}</th>
              <th>{__t('ui.onboarding.settings_page.langue_4vkz5r')}</th>
              <th>{__t('ui.onboarding.settings_page.actions_1rx51qc')}</th>
            </tr>
          </thead>
          <tbody>
            {pagination.pageItems.map((u) => (
              <tr key={u.userId}>
                <td>
                  <b>{u.username}</b>
                  <small>
                    {u.email ?? __t('ui.expression.onboarding.settings_page.sans_email_1g8cvqa')}
                  </small>
                </td>
                <td>{u.userType}</td>
                <td>{__t('ui.onboarding.settings_page.voir_la_fiche_1uk0bt5')}</td>
                <td>
                  {__t('ui.onboarding.settings_page.affectations_gerees_par_l_assistant_uyivx1')}
                </td>
                <td>{u.languagePreference}</td>
                <td>
                  <div className="table-actions">
                    <button
                      className="button button-small"
                      onClick={() =>
                        void updateUserStatus(u.userId, {
                          isActive: !u.isActive,
                        }).then(refresh)
                      }
                    >
                      {u.isActive
                        ? __t('ui.expression.onboarding.settings_page.suspendre_5nkyya')
                        : __t('ui.expression.onboarding.settings_page.activer_1qnbdon')}
                    </button>
                    <button
                      className="button button-small"
                      onClick={() =>
                        void setUserPassword(u.userId, {
                          newPassword: 'Root@123456',
                        })
                      }
                    >
                      {__t('ui.onboarding.settings_page.reinitialiser_mdp_1jj1i30')}
                    </button>
                    <button
                      className="button button-small button-danger"
                      type="button"
                      onClick={() => {
                        setDisconnectUser(u);
                      }}
                    >
                      {__t('settings.disconnectUser')}
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
      <Modal
        open={disconnectUser !== null}
        onOpenChange={(open) => {
          if (!open && !disconnecting) setDisconnectUser(null);
        }}
        title={__t('settings.disconnectUserTitle')}
        description={__t('settings.disconnectUserDescription', {
          username: disconnectUser?.username ?? '',
        })}
        actions={
          <>
            <button
              className="button"
              type="button"
              disabled={disconnecting}
              onClick={() => {
                setDisconnectUser(null);
              }}
            >
              {__t('common.cancel')}
            </button>
            <button
              className="button button-danger"
              type="button"
              disabled={!disconnectUser || disconnecting}
              onClick={() => {
                if (!disconnectUser) return;
                setDisconnecting(true);
                void logoutUserSessions({ userId: disconnectUser.userId })
                  .then(() => {
                    notify({
                      tone: 'success',
                      title: __t('settings.userDisconnected'),
                      message: disconnectUser.username,
                    });
                    setDisconnectUser(null);
                  })
                  .catch(notifyError)
                  .finally(() => {
                    setDisconnecting(false);
                  });
              }}
            >
              {__t('settings.disconnectAllSessions')}
            </button>
          </>
        }
      >
        <p className="admin-message">{__t('settings.disconnectUserHint')}</p>
      </Modal>
    </section>
  );
}
function TiersPanel({ items, open }: { items: Tiers; open: () => void }) {
  const { t: __t } = useTranslation();
  return (
    <section>
      <Header
        title={__t('ui.onboarding.settings_page.niveaux_de_service_1yfgjsz')}
        text={__t('settings.tiersHelp')}
        action={open}
        label={__t('ui.onboarding.settings_page.associer_un_niveau_1u25ann')}
      />
      <div className="tier-card-grid">
        {items.map((t) => (
          <div className="station" key={t.tierId}>
            <span className="status-badge status-info">
              {t.isSystem
                ? __t('ui.expression.onboarding.settings_page.systeme_exy534')
                : __t('ui.expression.onboarding.settings_page.catalogue_144nvkm')}
            </span>
            <h3>{t.tierName}</h3>
            <p>
              {t.tierCode} · {t.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
function NotificationsPanel({ open }: { open: () => void }) {
  const { t: __t } = useTranslation();
  const [text, setText] = useState('Bienvenue, votre ticket {ticket} est enregistré.');
  return (
    <section>
      <Header
        title={__t('ui.onboarding.settings_page.regles_de_notification_1bn7ke2')}
        text={__t('settings.rulesHelp')}
        action={open}
        label={__t('ui.onboarding.settings_page.nouvelle_regle_txat5j')}
      />
      <div className="sms-preview-grid">
        <label>
          {__t('ui.onboarding.settings_page.message_1cam7ic')}
          <textarea
            rows={6}
            maxLength={480}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
            }}
          />
          <small>
            {text.length}/480 · {Math.ceil(text.length / 160) || 1}{' '}
            {__t('ui.onboarding.settings_page.segment_s_c5snh2')}
          </small>
        </label>
        <div className="phone-preview">
          <b>{__t('ui.onboarding.settings_page.dori_9y7skh')}</b>
          <p>{text.replace('{ticket}', 'A-048')}</p>
        </div>
      </div>
    </section>
  );
}
function TranslationsPanel({ items, open }: { items: Translations; open: () => void }) {
  const { t: __t } = useTranslation();
  const pagination = useAdminPagination(items);
  return (
    <section>
      <Header
        title={__t('ui.onboarding.settings_page.traductions_dynamiques_1l3br9')}
        text={__t('settings.translationsHelp')}
        action={open}
        label={__t('ui.onboarding.settings_page.nouvelle_cle_5he7jx')}
      />
      <div className="table-wrap admin-table-wrap">
        <table>
          <thead>
            <tr>
              <th>{__t('ui.onboarding.settings_page.cle_1umb4x5')}</th>
              <th>{__t('ui.onboarding.settings_page.categorie_1m5ubmo')}</th>
              <th>{__t('ui.onboarding.settings_page.locale_1pfta5z')}</th>
              <th>{__t('ui.onboarding.settings_page.contenu_1hxusj9')}</th>
              <th>{__t('ui.onboarding.settings_page.variables_xqivz6')}</th>
            </tr>
          </thead>
          <tbody>
            {pagination.pageItems.map((x) => (
              <tr key={x.translationId}>
                <td>
                  <code>{x.translationKey}</code>
                </td>
                <td>{x.category}</td>
                <td>{x.locale}</td>
                <td>{x.content}</td>
                <td>{x.expectedParams?.join(', ') || '—'}</td>
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
function TierModal({
  open,
  close,
  queues,
  tiers,
  refresh,
}: {
  open: boolean;
  close: (v: boolean) => void;
  queues: QueueResponseDto[];
  tiers: Tiers;
  refresh: () => void;
}) {
  const { t: __t } = useTranslation();
  const [f, setF] = useState({
    queueId: 0,
    tierId: 0,
    price: 0,
    currency: '',
    order: 1,
    default: false,
  });
  return (
    <Modal
      open={open}
      onOpenChange={close}
      title={__t('ui.onboarding.settings_page.associer_un_niveau_1u25ann')}
      actions={
        <button
          className="button button-primary"
          disabled={!f.queueId || !f.tierId}
          onClick={() =>
            void associateTier(f.queueId, {
              tierId: f.tierId,
              price: f.price,
              currency: f.currency || null,
              displayOrder: f.order,
              isDefault: f.default,
            }).then(() => {
              refresh();
              close(false);
            })
          }
        >
          {__t('ui.onboarding.settings_page.associer_1akns98')}
        </button>
      }
    >
      <div className="form-grid">
        <Select
          label={__t('ui.onboarding.settings_page.file_bygjtv')}
          items={queues.map((q) => [q.queueId, q.queueName])}
          change={(id) => {
            setF({ ...f, queueId: id });
          }}
        />
        <Select
          label={__t('ui.onboarding.settings_page.niveau_gl02r')}
          items={tiers
            .filter((t) => ['GRATUIT', 'STANDARD', 'PREMIUM'].includes(t.tierCode.toUpperCase()))
            .map((t) => [t.tierId, t.tierName])}
          change={(id) => {
            setF({ ...f, tierId: id });
          }}
        />
        <label>
          {__t('ui.onboarding.settings_page.prix_gp2e6u')}
          <input
            type="number"
            min="0"
            value={f.price}
            onChange={(e) => {
              setF({ ...f, price: Number(e.target.value) });
            }}
          />
        </label>
        <label>
          {__t('ui.onboarding.settings_page.devise_1pl1r6r')}
          <input
            maxLength={3}
            placeholder={__t('ui.onboarding.settings_page.heritee_zqggrn')}
            value={f.currency}
            onChange={(e) => {
              setF({ ...f, currency: e.target.value.toUpperCase() });
            }}
          />
        </label>
        <label>
          {__t('ui.onboarding.settings_page.ordre_6421pl')}
          <input
            type="number"
            min="0"
            value={f.order}
            onChange={(e) => {
              setF({ ...f, order: Number(e.target.value) });
            }}
          />
        </label>
        <label className="check-row">
          {__t('ui.onboarding.settings_page.par_defaut_md7ct3')}
          <input
            type="checkbox"
            checked={f.default}
            onChange={(e) => {
              setF({ ...f, default: e.target.checked });
            }}
          />
        </label>
      </div>
    </Modal>
  );
}
function RuleModal({
  open,
  close,
  queues,
  tiers,
  refresh,
}: {
  open: boolean;
  close: (v: boolean) => void;
  queues: QueueResponseDto[];
  tiers: Tiers;
  refresh: () => void;
}) {
  const { t: __t } = useTranslation();
  const [f, setF] = useState({
    queueId: 0,
    tierId: 0,
    type: 'welcome',
    channel: 'sms',
    threshold: 'position',
    value: 3,
    tracking: true,
  });
  return (
    <Modal
      open={open}
      onOpenChange={close}
      title={__t('ui.onboarding.settings_page.nouvelle_regle_txat5j')}
      actions={
        <button
          className="button button-primary"
          disabled={!f.queueId || !f.tierId}
          onClick={() =>
            void createTierRule(f.queueId, f.tierId, {
              notificationType: f.type as 'welcome' | 'threshold',
              channel: f.channel as 'sms' | 'email',
              thresholdType:
                f.type === 'threshold' ? (f.threshold as 'position' | 'estimatedTime') : undefined,
              thresholdValue: f.type === 'threshold' ? f.value : undefined,
              includeTrackingLink: f.tracking,
            }).then(() => {
              refresh();
              close(false);
            })
          }
        >
          {__t('ui.onboarding.settings_page.enregistrer_sywgdx')}
        </button>
      }
    >
      <div className="form-grid">
        <Select
          label={__t('ui.onboarding.settings_page.file_bygjtv')}
          items={queues.map((q) => [q.queueId, q.queueName])}
          change={(id) => {
            setF({ ...f, queueId: id });
          }}
        />
        <Select
          label={__t('ui.onboarding.settings_page.niveau_gl02r')}
          items={tiers.map((t) => [t.tierId, t.tierName])}
          change={(id) => {
            setF({ ...f, tierId: id });
          }}
        />
        <label>
          {__t('ui.onboarding.settings_page.type_1m2zofh')}
          <select
            value={f.type}
            onChange={(e) => {
              setF({ ...f, type: e.target.value });
            }}
          >
            <option value="welcome">{__t('ui.onboarding.settings_page.welcome_okelqr')}</option>
            <option value="threshold">{__t('ui.onboarding.settings_page.threshold_6j3qu0')}</option>
          </select>
        </label>
        <label>
          {__t('ui.onboarding.settings_page.canal_1219p1c')}
          <select
            value={f.channel}
            onChange={(e) => {
              setF({ ...f, channel: e.target.value });
            }}
          >
            <option value="sms">{__t('ui.onboarding.settings_page.sms_q3rkiy')}</option>
            <option value="email">{__t('ui.onboarding.settings_page.email_inbfc7')}</option>
          </select>
        </label>
        {f.type === 'threshold' ? (
          <>
            <label>
              {__t('ui.onboarding.settings_page.seuil_1fkadkl')}
              <select
                value={f.threshold}
                onChange={(e) => {
                  setF({ ...f, threshold: e.target.value });
                }}
              >
                <option value="position">
                  {__t('ui.onboarding.settings_page.position_1quewx6')}
                </option>
                <option value="estimatedTime">
                  {__t('ui.onboarding.settings_page.temps_estime_1qfllgt')}
                </option>
              </select>
            </label>
            <label>
              {__t('ui.onboarding.settings_page.valeur_oyhka0')}
              <input
                type="number"
                min="1"
                value={f.value}
                onChange={(e) => {
                  setF({ ...f, value: Number(e.target.value) });
                }}
              />
            </label>
          </>
        ) : null}
      </div>
    </Modal>
  );
}
function TranslationModal({
  open,
  close,
  refresh,
}: {
  open: boolean;
  close: (v: boolean) => void;
  refresh: () => void;
}) {
  const { t: __t } = useTranslation();
  const [f, setF] = useState({ key: '', category: 'ihm', locale: 'fr', content: '', params: '' });
  return (
    <Modal
      open={open}
      onOpenChange={close}
      title={__t('ui.onboarding.settings_page.nouvelle_traduction_ujnesk')}
      actions={
        <button
          className="button button-primary"
          disabled={!f.key || !f.content}
          onClick={() =>
            void createTranslation({
              translationKey: f.key,
              category: f.category as 'ihm' | 'sms' | 'error',
              locale: f.locale,
              content: f.content,
              expectedParams: f.params
                .split(',')
                .map((x) => x.trim())
                .filter(Boolean),
            }).then(() => {
              refresh();
              close(false);
            })
          }
        >
          {__t('ui.onboarding.settings_page.enregistrer_sywgdx')}
        </button>
      }
    >
      <div className="form-grid">
        <label>
          {__t('ui.onboarding.settings_page.cle_1umb4x5')}
          <input
            value={f.key}
            onChange={(e) => {
              setF({ ...f, key: e.target.value });
            }}
          />
        </label>
        <label>
          {__t('ui.onboarding.settings_page.categorie_1m5ubmo')}
          <select
            value={f.category}
            onChange={(e) => {
              setF({ ...f, category: e.target.value });
            }}
          >
            <option>{__t('ui.onboarding.settings_page.ihm_y3wikr')}</option>
            <option>{__t('ui.onboarding.settings_page.sms_1ottih6')}</option>
            <option>{__t('ui.onboarding.settings_page.error_9bb0pd')}</option>
          </select>
        </label>
        <label>
          {__t('ui.onboarding.settings_page.locale_1pfta5z')}
          <input
            value={f.locale}
            onChange={(e) => {
              setF({ ...f, locale: e.target.value });
            }}
          />
        </label>
        <label>
          {__t('ui.onboarding.settings_page.parametres_1fyvea8')}
          <input
            placeholder={__t('ui.onboarding.settings_page.ticket_position_s2bm2e')}
            value={f.params}
            onChange={(e) => {
              setF({ ...f, params: e.target.value });
            }}
          />
        </label>
        <label className="form-span">
          {__t('ui.onboarding.settings_page.contenu_1hxusj9')}
          <textarea
            rows={4}
            value={f.content}
            onChange={(e) => {
              setF({ ...f, content: e.target.value });
            }}
          />
        </label>
      </div>
    </Modal>
  );
}
function Select({
  label,
  items,
  change,
}: {
  label: string;
  items: [number, string][];
  change: (id: number) => void;
}) {
  const { t: __t } = useTranslation();
  return (
    <label>
      {label}
      <select
        onChange={(e) => {
          change(Number(e.target.value));
        }}
      >
        <option value="">{__t('ui.onboarding.settings_page.choisir_4zi3t4')}</option>
        {items.map(([id, name]) => (
          <option value={id} key={id}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}
