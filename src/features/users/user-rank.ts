import type { RoleResponseDto } from '@/api/generated/models';
export function assignableRoles(roles: RoleResponseDto[], currentRank: number) {
  return roles.filter((role) => role.isActive && role.rank >= currentRank);
}
