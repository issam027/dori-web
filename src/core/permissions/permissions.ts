import type { CurrentUserResponseDto, UserScopeDto } from '@/api/generated/models';

export type Permission = string;

export function hasPermission(
  user: CurrentUserResponseDto | null,
  permission: Permission,
): boolean {
  return Boolean(user?.permissions.includes(permission));
}

export function hasAnyPermission(
  user: CurrentUserResponseDto | null,
  permissions: readonly Permission[],
): boolean {
  return (
    permissions.length === 0 || permissions.some((permission) => hasPermission(user, permission))
  );
}

export function isWithinScope(
  scope: UserScopeDto | undefined,
  resource: { siteId?: number; queueId?: number },
): boolean {
  if (!scope) return false;
  if (scope.isGlobal) return true;
  if (resource.siteId !== undefined && !scope.siteIds.includes(resource.siteId)) return false;
  if (resource.queueId !== undefined && !scope.queueIds.includes(resource.queueId)) return false;
  return true;
}
