const siteIndependentPaths = new Set([
  '/portfolio',
  '/profile',
  '/change-password',
  '/onboarding',
  '/health',
  '/legal',
  '/admin/translations',
]);

export function routeRequiresActiveSite(pathname: string): boolean {
  return !siteIndependentPaths.has(pathname);
}
