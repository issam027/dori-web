import type { SetUserPasswordDto } from '@/api/generated/models';

export const fallbackUserResetPassword = 'DoriReset@2026';

export function userPasswordResetDto(
  configuredPassword = import.meta.env.VITE_USER_RESET_PASSWORD,
): SetUserPasswordDto {
  return {
    newPassword: configuredPassword?.trim() || fallbackUserResetPassword,
  };
}
