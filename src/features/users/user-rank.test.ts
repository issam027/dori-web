import { describe, expect, it } from 'vitest';
import type { RoleResponseDto } from '@/api/generated/models';
import { assignableRoles } from './user-rank';
describe('role anti escalation', () => {
  it('hides roles more powerful than the actor', () => {
    const roles = [
      { roleId: 1, roleName: 'root', rank: 0, isActive: true, permissions: [] },
      { roleId: 2, roleName: 'admin', rank: 10, isActive: true, permissions: [] },
      { roleId: 3, roleName: 'operator', rank: 30, isActive: true, permissions: [] },
    ] as RoleResponseDto[];
    expect(assignableRoles(roles, 10).map((r) => r.roleName)).toEqual(['admin', 'operator']);
  });
});
