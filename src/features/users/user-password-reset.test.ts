import { fallbackUserResetPassword, userPasswordResetDto } from './user-password-reset';

describe('userPasswordResetDto', () => {
  it('uses the configured reset password', () => {
    expect(userPasswordResetDto('Configured@2026')).toEqual({
      newPassword: 'Configured@2026',
    });
  });

  it('uses a non-root fallback when the environment value is missing', () => {
    expect(userPasswordResetDto('')).toEqual({ newPassword: fallbackUserResetPassword });
    expect(fallbackUserResetPassword).toBe('DoriReset@2026');
    expect(fallbackUserResetPassword).not.toBe('Root@123456');
  });
});
