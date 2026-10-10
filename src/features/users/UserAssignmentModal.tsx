import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { RoleResponseDto, UserSummaryItemDto } from '@/api/generated/models';
import { queuesControllerAssignOperator } from '@/api/generated/queues/queues';
import { sitesControllerAssignManager } from '@/api/generated/sites/sites';
import {
  usersControllerAssignUserRole,
  usersControllerFindUsers,
} from '@/api/generated/users/users';
import { notifyError } from '@/core/notifications/error-presentation';
import { notify } from '@/core/notifications/notification-store';
import { Modal } from '@/design-system/components/Modal';
import { Pagination } from '@/design-system/components/Pagination';

export interface AssignmentTarget {
  kind: 'site' | 'queue';
  id: number;
  label: string;
}

export function UserAssignmentModal({
  target,
  roles,
  onOpenChange,
  onAssigned,
}: {
  target: AssignmentTarget | null;
  roles: RoleResponseDto[];
  onOpenChange: (open: boolean) => void;
  onAssigned: () => void;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<UserSummaryItemDto | null>(null);
  const [roleId, setRoleId] = useState(0);
  const [saving, setSaving] = useState(false);
  const compatibleRoles = roles.filter((role) =>
    target?.kind === 'site'
      ? role.roleName === 'manager'
      : role.roleName === 'hotesse' || role.roleName === 'operator',
  );

  useEffect(() => {
    const normalized = search.trim();
    const timer = window.setTimeout(() => {
      setDebouncedSearch(normalized);
    }, 300);
    return () => {
      window.clearTimeout(timer);
    };
  }, [search]);

  const close = () => {
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
    setSelectedUser(null);
    setRoleId(0);
    setSaving(false);
    onOpenChange(false);
  };

  const users = useQuery({
    queryKey: ['admin', 'assignment-users', debouncedSearch, page],
    queryFn: () =>
      usersControllerFindUsers({
        search: debouncedSearch,
        page,
        pageSize: 5,
        userType: 'human',
        sort: 'username:asc',
      }),
    enabled: Boolean(target && debouncedSearch.length >= 4),
  });
  const results = users.data?.data.items ?? [];
  const totalPages = users.data?.data.totalPages ?? 0;
  const searchPending = search.trim().length >= 4 && debouncedSearch !== search.trim();

  const assign = async () => {
    if (!target || !selectedUser || !roleId) return;
    setSaving(true);
    try {
      await usersControllerAssignUserRole(selectedUser.userId, { roleId });
      if (target.kind === 'site') {
        await sitesControllerAssignManager(target.id, { userId: selectedUser.userId });
      } else {
        await queuesControllerAssignOperator(target.id, { userId: selectedUser.userId });
      }
      notify({
        tone: 'success',
        title: t('settings.assignmentDone'),
        message: t('settings.assignmentDoneMessage', {
          username: selectedUser.username,
          resource: target.label,
        }),
      });
      onAssigned();
      close();
    } catch (error) {
      notifyError(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title={t('settings.assignUser')}
      description={t('settings.assignUserDescription', { resource: target?.label ?? '' })}
      actions={
        <>
          <button
            className="button"
            type="button"
            disabled={saving}
            onClick={() => {
              close();
            }}
          >
            {t('common.cancel')}
          </button>
          <button
            className="button button-primary"
            type="button"
            disabled={!selectedUser || !roleId || saving}
            onClick={() => void assign()}
          >
            {t('settings.confirmAssignment')}
          </button>
        </>
      }
    >
      <div className="assignment-flow">
        <section>
          <span className="eyebrow">{t('settings.assignmentStepUser')}</span>
          <label>
            {t('settings.searchUser')}
            <input
              type="search"
              value={search}
              placeholder={t('settings.searchUserPlaceholder')}
              autoComplete="off"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
                setSelectedUser(null);
                setRoleId(0);
              }}
            />
          </label>
          {search.trim().length < 4 ? (
            <p className="muted">{t('settings.searchUserMinimum')}</p>
          ) : searchPending || users.isFetching ? (
            <p className="muted" role="status">
              {t('common.loading')}
            </p>
          ) : results.length ? (
            <div className="assignment-user-results">
              {results.map((user) => (
                <button
                  type="button"
                  className={selectedUser?.userId === user.userId ? 'selected' : ''}
                  aria-pressed={selectedUser?.userId === user.userId}
                  disabled={!user.isActive}
                  key={user.userId}
                  onClick={() => {
                    setSelectedUser(user);
                    setRoleId(0);
                  }}
                >
                  <span className="profile-avatar">
                    {user.username.slice(0, 2).toUpperCase()}
                  </span>
                  <span>
                    <strong>{user.username}</strong>
                    <small>{user.email ?? t('settings.noEmail')}</small>
                  </span>
                  <span className={`status-badge ${user.isActive ? 'status-success' : ''}`}>
                    {user.isActive ? t('settings.active') : t('settings.inactive')}
                  </span>
                </button>
              ))}
            </div>
          ) : debouncedSearch.length >= 4 ? (
            <p className="muted">{t('settings.noUserFound')}</p>
          ) : null}
          {totalPages > 1 ? (
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          ) : null}
        </section>
        {selectedUser ? (
          <section className="assignment-role-step">
            <span className="eyebrow">{t('settings.assignmentStepRole')}</span>
            <strong>{selectedUser.username}</strong>
            <label>
              {t('settings.role')}
              <select
                value={roleId}
                onChange={(event) => {
                  setRoleId(Number(event.target.value));
                }}
              >
                <option value="">{t('settings.chooseRole')}</option>
                {compatibleRoles.map((role) => (
                  <option key={role.roleId} value={role.roleId}>
                    {role.roleName}
                  </option>
                ))}
              </select>
            </label>
            <p className="muted">
              {target?.kind === 'site'
                ? t('settings.siteRoleContract')
                : t('settings.queueRoleContract')}
            </p>
          </section>
        ) : null}
      </div>
    </Modal>
  );
}
