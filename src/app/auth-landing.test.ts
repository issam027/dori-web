import { describe, expect, it } from 'vitest';
import type { CurrentUserResponseDto } from '@/api/generated/models';
import { findLoginDestination } from './protected-routes';

const user = {
  userId: 'user',
  username: 'operator',
  userType: 'human',
  permissions: ['site_view', 'registration_call'],
  roles: ['operator'],
  mustChangePassword: false,
  scope: { isGlobal: false, siteIds: ['one'], queueIds: [] },
} as CurrentUserResponseDto;

describe('post-login destination', () => {
  it('does not return to a password form after the password requirement is cleared', () => {
    expect(findLoginDestination(user, '/change-password')).toBe('/desk');
    expect(findLoginDestination(user, '/login')).toBe('/desk');
  });
  it('selects the portfolio for multiple sites and the password page only when required', () => {
    expect(
      findLoginDestination({ ...user, scope: { ...user.scope, siteIds: ['one', 'two'] } }),
    ).toBe('/portfolio');
    expect(findLoginDestination({ ...user, mustChangePassword: true }, '/desk')).toBe(
      '/change-password',
    );
    expect(findLoginDestination({ ...user, userType: 'kiosk' })).toBe('/device-mode');
  });
  it('preserves legitimate deep links but never redirects to an external origin', () => {
    expect(findLoginDestination(user, '/reports')).toBe('/reports');
    expect(findLoginDestination(user, '//other.example')).toBe('/desk');
  });
});
