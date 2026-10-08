import { useEffect, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '@/core/auth/session-store';
import { hasAnyPermission } from '@/core/permissions/permissions';

const commands = [
  {
    id: 'desk',
    labelKey: 'commands.desk',
    path: '/desk',
    permissions: ['registration_call', 'session_operate'],
  },
  {
    id: 'person',
    labelKey: 'commands.person',
    path: '/my-queues',
    permissions: ['registration_view'],
  },
  {
    id: 'appointment',
    labelKey: 'commands.appointment',
    path: '/appointments',
    permissions: ['appointment_manage'],
  },
  {
    id: 'settings',
    labelKey: 'commands.settings',
    path: '/settings',
    permissions: ['site_edit', 'queue_edit'],
  },
] as const;

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useSessionStore((state) => state.user);
  const [query, setQuery] = useState('');
  const available = useMemo(
    () =>
      commands
        .filter((command) => hasAnyPermission(user, command.permissions))
        .filter((command) => t(command.labelKey).toLowerCase().includes(query.toLowerCase())),
    [query, t, user],
  );

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', listener);
    return () => {
      window.removeEventListener('keydown', listener);
    };
  }, [onOpenChange, open]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="command-palette">
          <Dialog.Title>{t('commands.title')}</Dialog.Title>
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            placeholder={t('commands.search')}
          />
          <div className="command-list">
            {available.map((command) => (
              <button
                key={command.id}
                type="button"
                onClick={() => {
                  void navigate(command.path);
                  onOpenChange(false);
                }}
              >
                {t(command.labelKey)}
              </button>
            ))}
          </div>
          <Dialog.Close className="sr-only">{t('common.close')}</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
