import { useEffect, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '@/core/auth/session-store';
import { hasAnyPermission } from '@/core/permissions/permissions';

const commands = [
  {
    id: 'desk',
    featured: true,
    labelKey: 'nav.desk',
    path: '/desk',
    permissions: ['registration_call', 'session_operate'],
  },
  {
    id: 'queues',
    featured: true,
    labelKey: 'nav.myQueues',
    path: '/my-queues',
    permissions: ['registration_view', 'queue_view'],
  },
  {
    id: 'appointment',
    featured: true,
    labelKey: 'nav.appointments',
    path: '/appointments',
    permissions: ['appointment_manage', 'appointment_checkin'],
  },
  { id: 'person', featured: true, labelKey: 'nav.persons', path: '/persons', permissions: ['registration_view'] },
  { id: 'control-room', labelKey: 'nav.controlRoom', path: '/control-room', permissions: ['report_view', 'queue_view'] },
  { id: 'notifications', labelKey: 'nav.notifications', path: '/notifications', permissions: ['notification_view'] },
  { id: 'reports', labelKey: 'nav.reports', path: '/reports', permissions: ['report_view'] },
  { id: 'kiosk', labelKey: 'nav.kiosk', path: '/kiosk', permissions: [] },
  { id: 'display', labelKey: 'nav.display', path: '/display', permissions: [] },
  { id: 'tracking', labelKey: 'nav.tracking', path: '/track', permissions: [] },
  { id: 'portfolio', labelKey: 'nav.portfolio', path: '/portfolio', permissions: ['site_view'] },
  {
    id: 'settings',
    labelKey: 'nav.settings',
    path: '/settings',
    permissions: ['site_edit', 'queue_edit', 'user_manage_admin', 'translation_manage'],
  },
  {
    id: 'users', labelKey: 'nav.usersAdmin', path: '/admin/users', permissions: ['user_manage_admin'],
  },
  { id: 'onboarding', labelKey: 'nav.onboarding', path: '/onboarding', permissions: ['site_create'] },
  { id: 'translations', labelKey: 'nav.translations', path: '/admin/translations', permissions: ['translation_manage'] },
  { id: 'health', labelKey: 'nav.health', path: '/health', permissions: ['system_manage'] },
  { id: 'profile', labelKey: 'profile.title', path: '/profile', permissions: [] },
  { id: 'password', labelKey: 'auth.changePassword.changerLeMotDePasse', path: '/change-password', permissions: [] },
  { id: 'legal', labelKey: 'nav.legal', path: '/legal', permissions: [] },
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
    () => {
      const normalizedQuery = query.trim().toLocaleLowerCase();
      return commands
        .filter((command) => hasAnyPermission(user, command.permissions))
        .filter((command) => normalizedQuery.length > 0 || ('featured' in command && command.featured))
        .filter((command) => {
          const label = t(command.labelKey).toLocaleLowerCase();
          const action = t('commands.goTo', { page: t(command.labelKey) }).toLocaleLowerCase();
          return `${label} ${action}`.includes(normalizedQuery);
        });
    },
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
                {t('commands.goTo', { page: t(command.labelKey) })}
              </button>
            ))}
            {available.length === 0 ? <p className="muted">{t('commands.noResults')}</p> : null}
          </div>
          <Dialog.Close className="sr-only">{t('common.close')}</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
