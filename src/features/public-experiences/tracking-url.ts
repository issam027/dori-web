export function trackingUrlFromToken(token?: string | null): string | null {
  const value = token?.trim();
  return value
    ? `${window.location.origin}/track?token=${encodeURIComponent(value)}`
    : null;
}
