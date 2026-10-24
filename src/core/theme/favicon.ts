export function updateFavicon(background: string, foreground: string): void {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="20" fill="${background}"/><text x="32" y="44" fill="${foreground}" font-family="Arial,sans-serif" font-size="36" font-weight="700" text-anchor="middle">D</text></svg>`;
  const href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');

  if (favicon) {
    favicon.href = href;
    return;
  }

  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/svg+xml';
  link.href = href;
  document.head.append(link);
}
