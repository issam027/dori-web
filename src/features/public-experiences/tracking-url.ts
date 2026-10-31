export function trackingUrlFromToken(token?: string | null): string | null {
  const value = token?.trim();
  if (!value) return null;
  const publicOrigin = import.meta.env.VITE_PUBLIC_TRACKING_URL?.trim() || window.location.origin;
  const url = new URL('/track', publicOrigin);
  url.searchParams.set('token', value);
  return url.toString();
}
