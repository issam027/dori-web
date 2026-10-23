import type { CurrentUserResponseDto } from '@/api/generated/models';
import { findFirstAuthorizedPath } from './route-access';
import { hasAnyPermission, hasPermission, isWithinScope } from './permissions';

const user: CurrentUserResponseDto = {
  userId: '00000000-0000-4000-8000-000000000001',
  username: 'operator',
  userType: 'human',
  roles: ['operator'],
  permissions: ['queue_view', 'registration_call'],
  mustChangePassword: false,
  scope: {
    isGlobal: false,
    siteIds: ['00000000-0000-4000-8000-000000000010'],
    queueIds: ['00000000-0000-4000-8000-000000000020'],
  },
};

describe('permissions and scope', () => {
  it('checks permissions and territorial scope independently', () => {
    expect(hasPermission(user, 'queue_view')).toBe(true);
    expect(hasAnyPermission(user, ['site_edit', 'registration_call'])).toBe(true);
    expect(
      isWithinScope(user.scope, {
        siteId: '00000000-0000-4000-8000-000000000010',
        queueId: '00000000-0000-4000-8000-000000000020',
      }),
    ).toBe(true);
    expect(isWithinScope(user.scope, { queueId: '00000000-0000-4000-8000-000000000099' })).toBe(
      false,
    );
  });

  it('keeps technical kiosk identities on technical routes', () => {
    expect(
      findFirstAuthorizedPath({
        ...user,
        userType: 'kiosk',
        roles: ['kiosk'],
        permissions: ['queue_view', 'registration_register', 'appointment_lookup'],
      }),
    ).toBe('/device-mode');
  });

  it('selects the first route from effective permissions, not role names', () => {
    expect(findFirstAuthorizedPath(user)).toBe('/desk');
    expect(
      findFirstAuthorizedPath({ ...user, roles: ['root'], permissions: ['report_view'] }),
    ).toBe('/control-room');
  });
});
