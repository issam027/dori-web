import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Search, UserMinus, UserPlus, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { UserSummaryItemDto } from '@/api/generated/models';
import {
  queuesControllerAssignOperator,
  queuesControllerGetOperators,
  queuesControllerRemoveOperator,
} from '@/api/generated/queues/queues';
import { usersControllerFindUsers } from '@/api/generated/users/users';
import { notifyError } from '@/core/notifications/error-presentation';
import { notify } from '@/core/notifications/notification-store';
import { Modal } from '@/design-system/components/Modal';
import { Pagination } from '@/design-system/components/Pagination';
import { getUserDisplayName, getUserInitials } from './user-display';
import { useDebouncedFilter } from '@/shared/forms/useDebouncedFilter';
import { SEARCH_MINIMUM_LENGTH } from '@/shared/forms/search-config';
import { queryKeys } from '@/api/client/query-keys';
import { Button } from '@/design-system/components/Button';
import { DorifyLoader } from '@/design-system/components/DorifyLoader';

type View = 'assigned' | 'add';

export function QueueOperatorsModal({
  queue,
  onOpenChange,
}: {
  queue: { queueId: string; queueName: string; siteId: string } | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>('assigned');
  const [search, setSearch] = useState('');
  const debounced = useDebouncedFilter(search, { delay: 300 });
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<UserSummaryItemDto>();
  const [pendingId, setPendingId] = useState<string>();

  const resetAddView = () => {
    setView('assigned');
    setSearch('');
    setPage(1);
    setSelectedUser(undefined);
  };
  const close = () => {
    resetAddView();
    onOpenChange(false);
  };
  const operatorsKey = queryKeys.queueOperators.byQueue(queue?.queueId);
  const operators = useQuery({
    queryKey: operatorsKey,
    queryFn: ({ signal }) =>
      queuesControllerGetOperators(queue?.queueId ?? '', undefined, undefined, signal),
    enabled: Boolean(queue),
  });
  const users = useQuery({
    queryKey: queryKeys.queueOperators.candidates(queue?.queueId, queue?.siteId, debounced, page),
    queryFn: ({ signal }) =>
      usersControllerFindUsers(
        {
          search: debounced,
          siteIds: queue?.siteId ?? '',
          isActive: true,
          page,
          pageSize: 5,
          sort: 'username:asc',
        },
        undefined,
        signal,
      ),
    enabled: Boolean(queue && view === 'add' && debounced.length >= SEARCH_MINIMUM_LENGTH),
  });
  const assigned = operators.data?.data.items ?? [];
  const assignedIds = new Set(assigned.map((operator) => operator.userId));
  const candidates = (users.data?.data.items ?? []).filter((user) => !assignedIds.has(user.userId));
  const searchPending =
    search.trim().length >= SEARCH_MINIMUM_LENGTH && debounced !== search.trim();
  const refresh = () => queryClient.invalidateQueries({ queryKey: operatorsKey });

  const assign = async () => {
    if (!queue || !selectedUser) return;
    setPendingId(selectedUser.userId);
    try {
      await queuesControllerAssignOperator(queue.queueId, { userId: selectedUser.userId });
      await refresh();
      notify({
        tone: 'success',
        title: t('settings.queueOperators.assigned'),
        message: getUserDisplayName(selectedUser),
      });
      resetAddView();
    } catch (error) {
      notifyError(error);
    } finally {
      setPendingId(undefined);
    }
  };
  const remove = async (userId: string, username: string) => {
    if (!queue) return;
    setPendingId(userId);
    try {
      await queuesControllerRemoveOperator(queue.queueId, userId);
      await refresh();
      notify({ tone: 'success', title: t('settings.queueOperators.removed'), message: username });
    } catch (error) {
      notifyError(error);
    } finally {
      setPendingId(undefined);
    }
  };

  return (
    <Modal
      open={Boolean(queue)}
      onOpenChange={(open) => {
        if (!open && pendingId === undefined) close();
      }}
      title={
        view === 'assigned'
          ? t('settings.queueOperators.title')
          : t('settings.queueOperators.addTitle')
      }
      description={queue?.queueName}
      actions={
        view === 'assigned' ? (
          <Button
            variant="primary"
            onClick={() => {
              setView('add');
            }}
          >
            <UserPlus aria-hidden="true" />
            {t('settings.queueOperators.addAssignment')}
          </Button>
        ) : (
          <>
            <Button
              icon={<ArrowLeft />}
              label={t('common.retour')}
              labelMode="responsive"
              title={t('common.retour')}
              disabled={pendingId !== undefined}
              onClick={resetAddView}
            />
            <Button
              variant="primary"
              disabled={!selectedUser || pendingId !== undefined}
              onClick={() => {
                void assign();
              }}
            >
              <UserPlus aria-hidden="true" />
              {t('settings.confirmAssignment')}
            </Button>
          </>
        )
      }
    >
      {view === 'assigned' ? (
        <section className="queue-operators-assigned">
          <h3>
            <Users aria-hidden="true" /> {t('settings.queueOperators.assignedTitle')}
          </h3>
          {assigned.length ? (
            <ul className="manager-list">
              {assigned.map((operator) => (
                <li key={operator.userId}>
                  <div>
                    <strong>{operator.username}</strong>
                    <span>{operator.email}</span>
                  </div>
                  <span className="status-badge status-success">{t('common.active')}</span>
                  <Button
                    variant="danger"
                    size="small"
                    pending={pendingId === operator.userId}
                    onClick={() => {
                      void remove(operator.userId, operator.username);
                    }}
                  >
                    <UserMinus aria-hidden="true" /> {t('common.remove')}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{t('settings.queueOperators.empty')}</p>
          )}
        </section>
      ) : (
        <div className="assignment-flow queue-operator-assignment-flow">
          <section>
            <span className="eyebrow">{t('settings.queueOperators.availableTitle')}</span>
            <label>
              {t('settings.searchUser')}
              <span className="input-with-icon">
                <Search aria-hidden="true" />
                <input
                  type="search"
                  value={search}
                  placeholder={t('settings.searchUserPlaceholder', {
                    count: SEARCH_MINIMUM_LENGTH,
                  })}
                  autoComplete="off"
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                    setSelectedUser(undefined);
                  }}
                />
              </span>
            </label>
            {search.trim().length < SEARCH_MINIMUM_LENGTH ? (
              <p className="muted">
                {t('settings.searchUserMinimum', { count: SEARCH_MINIMUM_LENGTH })}
              </p>
            ) : searchPending || users.isFetching ? (
              <DorifyLoader compact />
            ) : candidates.length ? (
              <div className="assignment-user-results">
                {candidates.map((user) => (
                  <Button
                    variant="unstyled"
                    className={selectedUser?.userId === user.userId ? 'selected' : ''}
                    aria-pressed={selectedUser?.userId === user.userId}
                    key={user.userId}
                    onClick={() => {
                      setSelectedUser(user);
                    }}
                  >
                    <span className="profile-avatar">{getUserInitials(user)}</span>
                    <span>
                      <strong>{getUserDisplayName(user)}</strong>
                      <small>
                        {user.fullName ? `@${user.username} · ` : ''}
                        {user.email ?? t('settings.noEmail')}
                      </small>
                    </span>
                    <span className="status-badge status-success">{t('settings.active')}</span>
                  </Button>
                ))}
              </div>
            ) : (
              <p className="muted">{t('settings.noUserFound')}</p>
            )}
            {(users.data?.data.totalPages ?? 0) > 1 ? (
              <Pagination
                page={page}
                totalPages={users.data?.data.totalPages ?? 1}
                onPageChange={setPage}
              />
            ) : null}
          </section>
        </div>
      )}
    </Modal>
  );
}
