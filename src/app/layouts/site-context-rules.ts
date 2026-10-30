const siteIndependentPaths = new Set([
  '/portfolio',
  '/profile',
  '/change-password',
  '/onboarding',
  '/health',
  '/audit',
  '/legal',
  '/admin/translations',
  '/admin/edge-installations',
]);

export function routeRequiresActiveSite(pathname: string): boolean {
  return !siteIndependentPaths.has(pathname);
}
