import {
  sitesControllerDeleteSite,
  sitesControllerFindSite,
  sitesControllerFindSites,
  sitesControllerUpdateSite,
} from '@/api/generated/sites/sites';

export const findSites = (signal?: AbortSignal, isActive?: boolean) =>
  sitesControllerFindSites({ page: 1, pageSize: 100, isActive }, undefined, signal);

export const findAllSites = (signal?: AbortSignal) => findSites(signal);

export const findSite = (siteId: string, signal?: AbortSignal) =>
  sitesControllerFindSite(siteId, undefined, signal);

export const deactivateSite = (siteId: string) => sitesControllerDeleteSite(siteId);

export const reactivateSite = (siteId: string) =>
  sitesControllerUpdateSite(siteId, { isActive: true });
