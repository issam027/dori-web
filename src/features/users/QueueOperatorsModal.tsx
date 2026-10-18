import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, UserMinus, UserPlus, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  queuesControllerAssignOperator,
  queuesControllerGetOperators,
  queuesControllerRemoveOperator,
} from '@/api/generated/queues/queues';
import { usersControllerFindUsers } from '@/api/generated/users/users';
import { notifyError } from '@/core/notifications/error-presentation';
import { notify } from '@/core/notifications/notification-store';
import { Modal } from '@/design-system/components/Modal';
import { getUserDisplayName } from './user-display';

export function QueueOperatorsModal({
  queue,
  onOpenChange,
}: {
  queue: { queueId: number; queueName: string } | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [pendingId, setPendingId] = useState<number>();
  useEffect(() => {
    const timer = window.setTimeout(() => { setDebounced(search.trim()); }, 250);
    return () => { window.clearTimeout(timer); };
  }, [search]);
  const operatorsKey = ['queue-operators', queue?.queueId];
  const operators = useQuery({
    queryKey: operatorsKey,
    queryFn: ({ signal }) => queuesControllerGetOperators(queue?.queueId ?? 0, undefined, undefined, signal),
    enabled: Boolean(queue),
  });
  const users = useQuery({
    queryKey: ['queue-operator-candidates', queue?.queueId, debounced],
    queryFn: ({ signal }) => usersControllerFindUsers({ search: debounced || undefined, isActive: true, page: 1, pageSize: 20, sort: 'username:asc' }, undefined, signal),
    enabled: Boolean(queue),
  });
  const assigned = operators.data?.data.items ?? [];
  const assignedIds = new Set(assigned.map((operator) => operator.userId));
  const candidates = (users.data?.data.items ?? []).filter((user) => !assignedIds.has(user.userId));
  const refresh = () => queryClient.invalidateQueries({ queryKey: operatorsKey });
  const assign = async (userId: number, username: string) => {
    if (!queue) return;
    setPendingId(userId);
    try {
      await queuesControllerAssignOperator(queue.queueId, { userId });
      await refresh();
      notify({ tone: 'success', title: t('settings.queueOperators.assigned'), message: username });
    } catch (error) { notifyError(error); } finally { setPendingId(undefined); }
  };
  const remove = async (userId: number, username: string) => {
    if (!queue) return;
    setPendingId(userId);
    try {
      await queuesControllerRemoveOperator(queue.queueId, userId);
      await refresh();
      notify({ tone: 'success', title: t('settings.queueOperators.removed'), message: username });
    } catch (error) { notifyError(error); } finally { setPendingId(undefined); }
  };
  return (
    <Modal open={Boolean(queue)} onOpenChange={onOpenChange} title={t('settings.queueOperators.title')} description={queue?.queueName}>
      <div className="queue-operators-layout">
        <section>
          <h3><Users aria-hidden="true" /> {t('settings.queueOperators.assignedTitle')}</h3>
          {assigned.length ? <ul className="manager-list">{assigned.map((operator) => (
            <li key={operator.userId}>
              <div><strong>{operator.username}</strong><span>{operator.email}</span></div>
              <span className="status-badge status-success">{t('common.active')}</span>
              <button className="button button-small button-danger" type="button" disabled={pendingId === operator.userId} onClick={() => void remove(operator.userId, operator.username)}>
                <UserMinus aria-hidden="true" /> {t('common.remove')}
              </button>
            </li>
          ))}</ul> : <p className="muted">{t('settings.queueOperators.empty')}</p>}
        </section>
        <section>
          <label>{t('settings.queueOperators.addTitle')}<span className="input-with-icon"><Search aria-hidden="true" /><input type="search" value={search} placeholder={t('settings.searchUserPlaceholder')} onChange={(event) => { setSearch(event.target.value); }} /></span></label>
          <ul className="manager-list">{candidates.map((user) => (
            <li key={user.userId}>
              <div><strong>{getUserDisplayName(user)}</strong><span>{user.fullName ? `@${user.username} · ` : ''}{user.email ?? t('settings.noEmail')}</span></div>
              <button className="button button-small" type="button" disabled={pendingId === user.userId} onClick={() => void assign(user.userId, getUserDisplayName(user))}>
                <UserPlus aria-hidden="true" /> {t('common.add')}
              </button>
            </li>
          ))}</ul>
        </section>
      </div>
    </Modal>
  );
}
