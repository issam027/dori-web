import { sitesControllerFindSite, sitesControllerFindSites } from '@/api/generated/sites/sites';

export const findSites = (signal?: AbortSignal) =>
  sitesControllerFindSites({ page: 1, pageSize: 100 }, undefined, signal);

export const findSite = (siteId: number, signal?: AbortSignal) =>
  sitesControllerFindSite(siteId, undefined, signal);
