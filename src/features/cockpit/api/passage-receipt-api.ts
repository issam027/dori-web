import { registrationsControllerFindOne } from '@/api/generated/registrations/registrations';
import { sitesControllerFindSite } from '@/api/generated/sites/sites';

export async function getPassageReceiptData(registrationId: string, siteId: string) {
  const [registration, site] = await Promise.all([
    registrationsControllerFindOne(registrationId),
    sitesControllerFindSite(siteId),
  ]);

  return { registration: registration.data, site: site.data };
}
