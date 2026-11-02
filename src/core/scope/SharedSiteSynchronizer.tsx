import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSessionStore } from '@/core/auth/session-store';
import { changeActiveSite, clearActiveSiteContext } from '@/core/auth/session-actions';
import { storageKeys } from '@/core/storage/storage-keys';
import { readSharedSiteId, useScopeStore } from './scope-store';

export function SharedSiteSynchronizer() {
  const queryClient = useQueryClient();
  const user = useSessionStore((state) => state.user);
  const status = useSessionStore((state) => state.status);
  useEffect(() => {
    if (status !== 'authenticated' || !user) return;
    let disposed = false;
    const synchronize = () => {
      if (disposed || useSessionStore.getState().status !== 'authenticated') return;
      const selected = readSharedSiteId();
      if (selected === useScopeStore.getState().activeSiteId) return;
      const change =
        selected && (user.scope.isGlobal || user.scope.siteIds.includes(selected))
          ? changeActiveSite(queryClient, selected, user.scope)
          : clearActiveSiteContext(queryClient);
      void change.catch(() => {
        // The normal site query exposes connection failures and can be retried.
      });
    };
    const storageChanged = (event: StorageEvent) => {
      if (
        event.storageArea === localStorage &&
        (event.key === storageKeys.local.activeSiteId || event.key === null)
      )
        synchronize();
    };
    const visible = () => {
      if (document.visibilityState === 'visible') synchronize();
    };
    window.addEventListener('storage', storageChanged);
    window.addEventListener('focus', synchronize);
    document.addEventListener('visibilitychange', visible);
    synchronize();
    return () => {
      disposed = true;
      window.removeEventListener('storage', storageChanged);
      window.removeEventListener('focus', synchronize);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [queryClient, status, user]);
  return null;
}
