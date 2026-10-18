import {
  sitesControllerDeleteSite,
  sitesControllerFindSite,
  sitesControllerFindSites,
  sitesControllerUpdateSite,
} from '@/api/generated/sites/sites';

export const findSites = (signal?: AbortSignal, isActive?: boolean) =>
  sitesControllerFindSites({ page: 1, pageSize: 100, isActive }, undefined, signal);

export const findAllSites = (signal?: AbortSignal) => findSites(signal);

export const findSite = (siteId: number, signal?: AbortSignal) =>
  sitesControllerFindSite(siteId, undefined, signal);

export const deactivateSite = (siteId: number) => sitesControllerDeleteSite(siteId);

export const reactivateSite = (siteId: number) =>
  sitesControllerUpdateSite(siteId, { isActive: true });
