export function trackingUrlFromToken(token?: string | null): string | null {
  const value = token?.trim();
  if (!value) return null;
  const configuredOrigin: unknown = import.meta.env.VITE_PUBLIC_TRACKING_URL;
  const publicOrigin =
    typeof configuredOrigin === 'string' && configuredOrigin.trim()
      ? configuredOrigin.trim()
      : window.location.origin;
  const url = new URL('/track', publicOrigin);
  url.searchParams.set('token', value);
  return url.toString();
}
