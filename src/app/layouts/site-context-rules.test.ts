import { describe, expect, it } from 'vitest';
import { routeRequiresActiveSite } from './site-context-rules';

describe('active site route rules', () => {
  it.each(['/portfolio', '/profile', '/change-password', '/onboarding', '/health'])(
    'allows %s without an active site',
    (pathname) => {
      expect(routeRequiresActiveSite(pathname)).toBe(false);
    },
  );

  it.each(['/desk', '/queues', '/appointments', '/reports'])(
    'requires a site for %s',
    (pathname) => {
      expect(routeRequiresActiveSite(pathname)).toBe(true);
    },
  );
});
