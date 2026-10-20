import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  KeyRound,
  Eye,
  LogOut,
  MoreHorizontal,
  Pencil,
  Plus,
  Save,
  Search,
  UserCheck,
  Users,
  UserX,
  Trash2,
} from 'lucide-react';
import type {
  UserResponseDto,
  UserSummaryItemDto,
  UsersControllerFindUsersParams,
} from '@/api/generated/models';
import { Card } from '@/design-system/components/Card';
import { Modal } from '@/design-system/components/Modal';
import { PageHeader } from '@/design-system/components/PageHeader';
import { Pagination } from '@/design-system/components/Pagination';
import { UserAccountWizard } from '@/features/users/UserAccountWizard';
import { getUserDisplayName } from '@/features/users/user-display';
import { useScopeStore } from '@/core/scope/scope-store';
import { useSessionStore } from '@/core/auth/session-store';
import { hasAnyPermission } from '@/core/permissions/permissions';
import { notifyError } from '@/core/notifications/error-presentation';
import { notify } from '@/core/notifications/notification-store';
import { useDebouncedFilter } from '@/shared/forms/useDebouncedFilter';
import { useSettingsData } from '@/features/onboarding/hooks/useSettingsData';
import { queryKeys } from '@/api/client/query-keys';
import {
  deleteUser,
  findUserById,
  findUsers,
  logoutUserSessions,
  setUserPassword,
  updateUser,
  updateUserStatus,
} from '@/features/onboarding/api/onboarding-api';
import { Button } from '@/design-system/components/Button';
import { DataTable } from '@/design-system/components/DataTable';
import { formatDateTime } from '@/core/i18n/date-format';

const PAGE_SIZE = 10;
export function UsersAdminPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const siteId = useScopeStore((state) => state.activeSiteId);
  const current = useSessionStore((state) => state.user);
  const canDeleteUsers = hasAnyPermission(current, [
    'user_manage_kiosk',
    'user_manage_operator',
    'user_manage_manager',
    'user_manage_admin',
  ]);
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState({ search: '', userType: '', sort: 'username:asc' });
  const [filters, setFilters] = useState(draft);
  const [createOpen, setCreateOpen] = useState(false);
  const { sites, queues, roles } = useSettingsData(siteId, 'active', {
    sites: createOpen,
    queues: createOpen,
    roles: createOpen,
    tiers: false,
    directUsers: false,
  });
  const [editing, setEditing] = useState<UserSummaryItemDto>();
  const [viewingId, setViewingId] = useState<number>();
  const [deleting, setDeleting] = useState<UserSummaryItemDto>();
  const [editForm, setEditForm] = useState({ fullName: '', email: '', language: 'fr' });
  const [disconnecting, setDisconnecting] = useState<UserSummaryItemDto>();
  const [openActionsUserId, setOpenActionsUserId] = useState<number>();
  const [pending, setPending] = useState(false);
  const debouncedSearch = useDebouncedFilter(draft.search, { delay: 350, minimumLength: 4 });
  const effectiveFilters = { ...filters, search: debouncedSearch };
  useEffect(() => {
    if (openActionsUserId === undefined) return;
    const close = (event: PointerEvent) => {
      if (!(event.target as Element).closest('.row-actions-menu')) setOpenActionsUserId(undefined);
    };
    document.addEventListener('pointerdown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
    };
  }, [openActionsUserId]);
  const users = useQuery({
    queryKey: queryKeys.admin.usersPage(page, effectiveFilters),
    queryFn: ({ signal }) =>
      findUsers(
        {
          page,
          pageSize: PAGE_SIZE,
          sort: effectiveFilters.sort as UsersControllerFindUsersParams['sort'],
          siteIds:
            current && !current.scope.isGlobal && current.scope.siteIds.length
              ? current.scope.siteIds.join(',')
              : undefined,
          search: effectiveFilters.search || undefined,
          userType: (effectiveFilters.userType ||
            undefined) as UsersControllerFindUsersParams['userType'],
        },
        undefined,
        signal,
      ),
  });
  const userDetail = useQuery({
    queryKey: queryKeys.admin.userDetail(viewingId),
    queryFn: ({ signal }) => findUserById(viewingId ?? 0, undefined, signal),
    enabled: Boolean(viewingId),
  });
  const items = users.data?.data.items ?? [];
  const totalPages = Math.max(1, users.data?.data.totalPages ?? 1);
  const rank = Math.max(
    ...roles.filter((role) => current?.roles.includes(role.roleName)).map((role) => role.rank),
    0,
  );
  const refresh = async () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.usersPages });
  const edit = (user: UserSummaryItemDto) => {
    setEditing(user);
    setEditForm({
      fullName: user.fullName ?? '',
      email: user.email ?? '',
      language: user.languagePreference,
    });
  };
  const saveEdit = async () => {
    if (!editing) return;
    setPending(true);
    try {
      await updateUser(editing.userId, {
        fullName: editForm.fullName.trim() || undefined,
        email: editForm.email || undefined,
        languagePreference: editForm.language,
      });
      await refresh();
      notify({
        tone: 'success',
        title: t('admin.users.updateSuccess'),
        message: getUserDisplayName(editing),
      });
      setEditing(undefined);
    } catch (error) {
      notifyError(error);
    } finally {
      setPending(false);
    }
  };
  return (
    <div className="page-stack admin-page users-admin-page">
      <PageHeader
        eyebrow={t('common.administration')}
        title={t('admin.users.utilisateurs')}
        description={t('admin.users.pageDescription')}
        actions={
          <Button
            variant="unstyled"
            className="button button-primary"
            type="button"
            onClick={() => {
              setCreateOpen(true);
            }}
          >
            <Plus /> {t('onboarding.settings.nouvelUtilisateur')}
          </Button>
        }
      />
      <Card className="admin-filter-card">
        <details>
          <summary>
            <span>
              <Search /> {t('admin.users.rechercherUnUtilisateur')}
            </span>
            <small>{t('admin.users.nomEmailOuTypeDeCompte')}</small>
          </summary>
          <div className="admin-filter-grid">
            <label>
              {t('admin.users.recherche')}
              <input
                value={draft.search}
                placeholder={t('admin.users.nomDUtilisateurOuEmail')}
                onChange={(event) => {
                  const search = event.target.value;
                  setDraft({ ...draft, search });
                  setPage(1);
                  if (search.trim().length <= 3) {
                    setFilters((currentFilters) => ({ ...currentFilters, search: '' }));
                  }
                }}
              />
            </label>
            <label>
              {t('profile.profile.typeDeCompte')}
              <select
                value={draft.userType}
                onChange={(event) => {
                  const userType = event.target.value;
                  setDraft({ ...draft, userType });
                  setFilters((currentFilters) => ({ ...currentFilters, userType }));
                  setPage(1);
                }}
              >
                <option value="">{t('supervision.notifications.tous')}</option>
                <option value="human">{t('common.humain')}</option>
                <option value="kiosk">{t('admin.users.kiosque')}</option>
              </select>
            </label>
            <label>
              {t('notifications.filters.sort')}
              <select
                value={draft.sort}
                onChange={(event) => {
                  const sort = event.target.value;
                  setDraft({ ...draft, sort });
                  setFilters((currentFilters) => ({ ...currentFilters, sort }));
                  setPage(1);
                }}
              >
                <option value="username:asc">
                  {t('common.name')} · {t('common.sortAscending')}
                </option>
                <option value="username:desc">
                  {t('common.name')} · {t('common.sortDescending')}
                </option>
                <option value="lastLogin:desc">{t('admin.users.lastLogin')} ↓</option>
                <option value="lastLogin:asc">{t('admin.users.lastLogin')} ↑</option>
                <option value="createdAt:desc">{t('common.createdAt')} ↓</option>
              </select>
            </label>
          </div>
        </details>
      </Card>
      <Card className="settings-card">
        <div className="card-heading">
          <div>
            <span className="translation-heading-icon">
              <Users />
            </span>
            <h2>{t('admin.users.comptesUtilisateurs')}</h2>
            <p>{t('admin.users.sensitiveActionsNotice')}</p>
          </div>
        </div>
        <DataTable
          caption={t('admin.users.comptesUtilisateurs')}
          containerClassName="table-wrap admin-table-wrap"
        >
          <thead>
            <tr>
              <th scope="col">{t('users.singular')}</th>
              <th scope="col">{t('common.type')}</th>
              <th scope="col">{t('common.language')}</th>
              <th scope="col">{t('admin.users.lastLogin')}</th>
              <th scope="col">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((user) => (
              <tr key={user.userId}>
                <td>
                  <b>{getUserDisplayName(user)}</b>
                  <small>
                    {user.fullName ? `@${user.username} · ` : ''}
                    {user.email ?? t('settings.noEmail')}
                  </small>
                </td>
                <td>
                  <span className="status-badge status-info">{user.userType}</span>
                </td>
                <td>{user.languagePreference.toUpperCase()}</td>
                <td>
                  {user.lastLogin
                    ? formatDateTime(user.lastLogin, i18n.language)
                    : t('common.notProvided')}
                </td>
                <td>
                  <div className="row-user-actions">
                    <Button
                      variant="unstyled"
                      className="button button-small"
                      type="button"
                      title={t('common.view')}
                      onClick={() => {
                        setViewingId(user.userId);
                      }}
                    >
                      <Eye />
                      {t('common.view')}
                    </Button>
                    <Button
                      variant="unstyled"
                      className="button button-small"
                      type="button"
                      title={t('common.edit')}
                      onClick={() => {
                        edit(user);
                      }}
                    >
                      <Pencil /> {t('common.edit')}
                    </Button>
                    {canDeleteUsers ? (
                      <Button
                        variant="unstyled"
                        className="button button-small button-danger"
                        type="button"
                        title={t('common.delete')}
                        disabled={current?.userId === user.userId}
                        onClick={() => {
                          setDeleting(user);
                        }}
                      >
                        <Trash2 />
                        {t('common.delete')}
                      </Button>
                    ) : null}
                    <div className="row-actions-menu">
                      <Button
                        variant="unstyled"
                        className="button button-small"
                        type="button"
                        title={t('common.actions')}
                        aria-label={t('common.actions')}
                        aria-expanded={openActionsUserId === user.userId}
                        onClick={() => {
                          setOpenActionsUserId((currentId) =>
                            currentId === user.userId ? undefined : user.userId,
                          );
                        }}
                      >
                        <MoreHorizontal aria-hidden="true" />
                      </Button>
                      {openActionsUserId === user.userId ? (
                        <div className="row-actions-popover">
                          <Button
                            variant="unstyled"
                            className="button button-small"
                            type="button"
                            title={user.isActive ? t('admin.users.suspend') : t('common.activate')}
                            onClick={() =>
                              void updateUserStatus(user.userId, {
                                isActive: !user.isActive,
                              })
                                .then(refresh)
                                .catch(notifyError)
                            }
                          >
                            {user.isActive ? (
                              <UserX aria-hidden="true" />
                            ) : (
                              <UserCheck aria-hidden="true" />
                            )}
                            {user.isActive ? t('admin.users.suspend') : t('common.activate')}
                          </Button>
                          <Button
                            variant="unstyled"
                            className="button button-small"
                            type="button"
                            title={t('onboarding.settings.reinitialiserMdp')}
                            onClick={() =>
                              void setUserPassword(user.userId, {
                                newPassword: 'Root@123456',
                              })
                                .then(() =>
                                  notify({
                                    tone: 'success',
                                    title: t('admin.users.passwordResetSuccess'),
                                    message: getUserDisplayName(user),
                                  }),
                                )
                                .catch(notifyError)
                            }
                          >
                            <KeyRound /> {t('onboarding.settings.reinitialiserMdp')}
                          </Button>
                          <Button
                            variant="unstyled"
                            className="button button-small button-danger"
                            type="button"
                            title={t('admin.users.deconnecter')}
                            onClick={() => {
                              setDisconnecting(user);
                            }}
                          >
                            <LogOut /> {t('admin.users.deconnecter')}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
        {totalPages > 1 ? (
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        ) : null}
      </Card>
      <UserAccountWizard
        open={createOpen}
        onOpenChange={setCreateOpen}
        roles={roles}
        sites={sites.filter(
          (site) => current?.scope.isGlobal || current?.scope.siteIds.includes(site.siteId),
        )}
        queues={queues}
        currentRoleRank={rank}
        onCreated={() => void refresh()}
      />
      <Modal
        open={Boolean(viewingId)}
        onOpenChange={(open) => {
          if (!open) setViewingId(undefined);
        }}
        title={t('admin.users.detailsTitle')}
        description={userDetail.data ? getUserDisplayName(userDetail.data.data) : undefined}
      >
        {userDetail.data ? (
          <UserDetail user={userDetail.data.data} locale={i18n.language} t={t} />
        ) : (
          <p className="muted">{t('common.loading')}</p>
        )}
      </Modal>
      <Modal
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open && !pending) setDeleting(undefined);
        }}
        title={t('admin.users.deleteTitle')}
        description={deleting ? getUserDisplayName(deleting) : undefined}
        actions={
          <Button
            variant="unstyled"
            className="button button-danger"
            type="button"
            disabled={pending}
            onClick={() => {
              if (!deleting) return;
              setPending(true);
              void deleteUser(deleting.userId)
                .then(async () => {
                  await refresh();
                  notify({
                    tone: 'success',
                    title: t('admin.users.deleteSuccess'),
                    message: getUserDisplayName(deleting),
                  });
                  setDeleting(undefined);
                })
                .catch(notifyError)
                .finally(() => {
                  setPending(false);
                });
            }}
          >
            <Trash2 />
            {t('common.delete')}
          </Button>
        }
      >
        <p className="admin-message">{t('admin.users.deleteDescription')}</p>
      </Modal>
      <Modal
        open={Boolean(editing)}
        onOpenChange={(next) => {
          if (!next && !pending) setEditing(undefined);
        }}
        title={t('admin.users.modifierLUtilisateur')}
        description={editing ? getUserDisplayName(editing) : undefined}
        actions={
          <>
            <Button
              variant="unstyled"
              className="button button-primary"
              type="button"
              disabled={pending || !editForm.language}
              onClick={() => void saveEdit()}
            >
              <Save /> {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="translation-modal-intro">
          <span>
            <Pencil />
          </span>
          <div>
            <strong>{editing ? getUserDisplayName(editing) : ''}</strong>
            <small>{t('admin.users.identiteEtPreferencesDuCompte')}</small>
          </div>
        </div>
        <div className="form-grid">
          <label>
            {t('common.fullName')}
            <input
              autoComplete="name"
              maxLength={150}
              value={editForm.fullName}
              onChange={(event) => {
                setEditForm({ ...editForm, fullName: event.target.value });
              }}
            />
          </label>
          <label>
            {t('common.email')}
            <input
              type="email"
              value={editForm.email}
              onChange={(event) => {
                setEditForm({ ...editForm, email: event.target.value });
              }}
            />
          </label>
          <label>
            {t('common.language')}
            <select
              value={editForm.language}
              onChange={(event) => {
                setEditForm({ ...editForm, language: event.target.value });
              }}
            >
              <option value="fr">{t('locale.fr')}</option>
              <option value="en">{t('common.english')}</option>
              <option value="ar">{t('locale.ar')}</option>
            </select>
          </label>
        </div>
      </Modal>
      <Modal
        open={Boolean(disconnecting)}
        onOpenChange={(next) => {
          if (!next && !pending) setDisconnecting(undefined);
        }}
        title={t('admin.users.deconnecterToutesLesSessions')}
        description={disconnecting ? getUserDisplayName(disconnecting) : undefined}
        actions={
          <>
            <Button
              variant="unstyled"
              className="button button-danger"
              type="button"
              disabled={pending}
              onClick={() => {
                if (!disconnecting) return;
                setPending(true);
                void logoutUserSessions({ userId: disconnecting.userId })
                  .then(() => {
                    notify({
                      tone: 'success',
                      title: t('settings.userDisconnected'),
                      message: getUserDisplayName(disconnecting),
                    });
                    setDisconnecting(undefined);
                  })
                  .catch(notifyError)
                  .finally(() => {
                    setPending(false);
                  });
              }}
            >
              <LogOut /> {t('admin.users.deconnecter')}
            </Button>
          </>
        }
      >
        <p className="admin-message">
          {t('admin.users.toutesLesSessionsActivesSerontImmediatementRevoquees.')}
        </p>
      </Modal>
    </div>
  );
}

function UserDetail({
  user,
  locale,
  t,
}: {
  user: UserResponseDto;
  locale: string;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  return (
    <div className="user-detail-panel user-detail-modern">
      <header>
        <span className="profile-avatar">{getUserDisplayName(user).slice(0, 2).toUpperCase()}</span>
        <div>
          <h3>{getUserDisplayName(user)}</h3>
          <p>
            @{user.username} · {user.email ?? t('settings.noEmail')}
          </p>
        </div>
        <span className={`status-badge ${user.isActive ? 'status-success' : 'status-warning'}`}>
          {t(user.isActive ? 'common.active' : 'common.inactive')}
        </span>
      </header>
      <dl className="detail-list">
        <div>
          <dt>{t('common.language')}</dt>
          <dd>{user.languagePreference.toUpperCase()}</dd>
        </div>
        <div>
          <dt>{t('admin.users.lastLogin')}</dt>
          <dd>{formatDateTime(user.lastLogin, locale) ?? t('common.notProvided')}</dd>
        </div>
      </dl>
      <div className="user-detail-scopes">
        <section>
          <h3>{t('onboarding.settings.roles')}</h3>
          <div className="badge-row">
            {user.roles.map((role) => (
              <span className="status-badge status-info" key={role.roleId}>
                {role.roleName}
              </span>
            ))}
          </div>
        </section>
        <section>
          <h3>{t('sites.plural')}</h3>
          <p>{user.sites.map((site) => site.siteName).join(', ') || t('common.none')}</p>
        </section>
        <section>
          <h3>{t('queues.plural')}</h3>
          <p>{user.queues.map((queue) => queue.queueName).join(', ') || t('common.none')}</p>
        </section>
      </div>
    </div>
  );
}
