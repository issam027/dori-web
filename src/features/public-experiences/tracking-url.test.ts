import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('trackingUrlFromToken', () => {
  it('uses the configured Cloud public origin for an Intra ticket', async () => {
    vi.stubEnv('VITE_PUBLIC_TRACKING_URL', 'https://cloud.dorify.app');
    const { trackingUrlFromToken } = await import('./tracking-url');

    expect(trackingUrlFromToken('550e8400-e29b-41d4-a716-446655440000')).toBe(
      'https://cloud.dorify.app/track?token=550e8400-e29b-41d4-a716-446655440000',
    );
  });

  it('falls back to the current application origin when no public origin is configured', async () => {
    vi.stubEnv('VITE_PUBLIC_TRACKING_URL', '');
    const { trackingUrlFromToken } = await import('./tracking-url');

    expect(trackingUrlFromToken('ticket-token')).toBe(
      `${window.location.origin}/track?token=ticket-token`,
    );
  });
});
