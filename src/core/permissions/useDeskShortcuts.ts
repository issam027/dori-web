import { useEffect } from 'react';
import { useSessionStore } from '@/core/auth/session-store';
import { hasPermission } from './permissions';

interface DeskShortcutActions {
  callNext?: () => void;
  markServed?: () => void;
  markNoShow?: () => void;
  createRegistration?: () => void;
}

export function useDeskShortcuts(actions: DeskShortcutActions, enabled = true): void {
  const user = useSessionStore((state) => state.user);
  useEffect(() => {
    if (!enabled) return;
    const listener = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return;
      if (event.code === 'Space' && hasPermission(user, 'registration_call')) actions.callNext?.();
      if (event.key === 'Enter' && hasPermission(user, 'registration_call')) actions.markServed?.();
      if (event.key === 'Escape' && hasPermission(user, 'registration_call'))
        actions.markNoShow?.();
      if (event.key.toLowerCase() === 'n' && hasPermission(user, 'registration_register'))
        actions.createRegistration?.();
    };
    window.addEventListener('keydown', listener);
    return () => {
      window.removeEventListener('keydown', listener);
    };
  }, [actions, enabled, user]);
}
