import { describe, expect, it } from 'vitest';
import type { RoleResponseDto } from '@/api/generated/models';
import { assignableRoles } from './user-rank';
describe('role anti escalation', () => {
  it('hides roles more powerful than the actor', () => {
    const roles = [
      { roleId: 1, roleName: 'kiosk', rank: 1, isActive: true, permissions: [] },
      { roleId: 2, roleName: 'hotesse', rank: 2, isActive: true, permissions: [] },
      { roleId: 3, roleName: 'manager', rank: 3, isActive: true, permissions: [] },
      { roleId: 4, roleName: 'admin', rank: 4, isActive: true, permissions: [] },
      { roleId: 5, roleName: 'root', rank: 5, isActive: true, permissions: [] },
    ] as RoleResponseDto[];
    expect(assignableRoles(roles, 4).map((r) => r.roleName)).toEqual([
      'kiosk',
      'hotesse',
      'manager',
      'admin',
    ]);
    expect(assignableRoles(roles, 5).map((r) => r.roleName)).toEqual([
      'kiosk',
      'hotesse',
      'manager',
      'admin',
      'root',
    ]);
  });
});
