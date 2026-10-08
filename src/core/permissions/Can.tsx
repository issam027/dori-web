import type { ReactNode } from 'react';
import { useSessionStore } from '@/core/auth/session-store';
import { hasAnyPermission, isWithinScope, type Permission } from './permissions';

interface CanProps {
  permissions?: readonly Permission[];
  siteId?: number;
  queueId?: number;
  fallback?: ReactNode;
  children: ReactNode;
}

export function Can({ permissions = [], siteId, queueId, fallback = null, children }: CanProps) {
  const user = useSessionStore((state) => state.user);
  const allowed =
    hasAnyPermission(user, permissions) && isWithinScope(user?.scope, { siteId, queueId });

  return allowed ? children : fallback;
}
