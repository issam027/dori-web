import { registrationsControllerFindOne } from '@/api/generated/registrations/registrations';

export const getPassageReceiptRegistration = async (registrationId: string) =>
  (await registrationsControllerFindOne(registrationId)).data;
