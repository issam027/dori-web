const siteIndependentPaths = new Set([
  '/portfolio',
  '/profile',
  '/change-password',
  '/onboarding',
  '/health',
]);

export function routeRequiresActiveSite(pathname: string): boolean {
  return !siteIndependentPaths.has(pathname);
}
