import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSessionStore } from '@/core/auth/session-store';
import { hasAnyPermission, type Permission } from './permissions';

interface ProtectedRouteProps {
  permissions?: readonly Permission[];
  userTypes?: readonly string[];
}

export function ProtectedRoute({ permissions = [], userTypes }: ProtectedRouteProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const status = useSessionStore((state) => state.status);
  const user = useSessionStore((state) => state.user);

  if (status === 'hydrating') return <p role="status">{t('common.loading')}</p>;
  if (status !== 'authenticated' || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }
  if (userTypes && !userTypes.includes(user.userType)) {
    return <Navigate to="/forbidden" replace />;
  }
  if (!hasAnyPermission(user, permissions)) return <Navigate to="/forbidden" replace />;
  return <Outlet />;
}
