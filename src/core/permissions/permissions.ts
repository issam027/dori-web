import type { CurrentUserResponseDto } from '@/api/generated/models';

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
