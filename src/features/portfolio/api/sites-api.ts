import {
  sitesControllerDeleteSite,
  sitesControllerFindSite,
  sitesControllerFindSites,
  sitesControllerUpdateSite,
} from '@/api/generated/sites/sites';

export const findSites = (signal?: AbortSignal, isActive = true) =>
  sitesControllerFindSites({ page: 1, pageSize: 100, isActive }, undefined, signal);

export async function findAllSites(signal?: AbortSignal) {
  const [active, inactive] = await Promise.all([findSites(signal, true), findSites(signal, false)]);
  return {
    ...active,
    data: {
      ...active.data,
      items: [...active.data.items, ...inactive.data.items],
      total: active.data.total + inactive.data.total,
      totalPages: 1,
    },
  };
}

export const findSite = (siteId: number, signal?: AbortSignal) =>
  sitesControllerFindSite(siteId, undefined, signal);

export const deactivateSite = (siteId: number) => sitesControllerDeleteSite(siteId);

export const reactivateSite = (siteId: number) =>
  sitesControllerUpdateSite(siteId, { isActive: true });
