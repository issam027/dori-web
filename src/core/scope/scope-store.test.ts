import { readSharedSiteId, readStoredSiteId, useScopeStore } from './scope-store';
import { storageKeys } from '@/core/storage/storage-keys';
const scope = { isGlobal: false, siteIds: ['alpha', 'beta'], queueIds: [] };
beforeEach(() => {
  useScopeStore.getState().clear();
});
afterEach(() => {
  useScopeStore.getState().clear();
});
it('shares a validated site in local storage and removes its per-tab predecessor', () => {
  sessionStorage.setItem(storageKeys.session.activeSiteId, 'alpha');
  expect(readStoredSiteId()).toBe('alpha');
  useScopeStore.getState().setActiveSite('beta', scope);
  expect(readSharedSiteId()).toBe('beta');
  expect(sessionStorage.getItem(storageKeys.session.activeSiteId)).toBeNull();
  expect(readStoredSiteId()).toBe('beta');
});
it('rejects out-of-scope sites without overwriting the shared selection', () => {
  useScopeStore.getState().setActiveSite('alpha', scope);
  expect(() => {
    useScopeStore.getState().setActiveSite('foreign', scope);
  }).toThrow();
  expect(readSharedSiteId()).toBe('alpha');
});
it('clears the shared site and the active queue', () => {
  useScopeStore.getState().setActiveSite('alpha', scope);
  useScopeStore.getState().clear();
  expect(readSharedSiteId()).toBeNull();
  expect(useScopeStore.getState()).toMatchObject({ activeSiteId: null, activeQueueId: null });
});
