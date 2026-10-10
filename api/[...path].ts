const productionApiOrigin = 'https://dori-api.vercel.app';
const developmentApiOrigin = 'https://dori-api-dev.vercel.app';

function apiOrigin(): string {
  const configuredOrigin = globalThis.process.env.API_PROXY_TARGET?.replace(/\/$/, '');
  if (configuredOrigin) return configuredOrigin;
  return globalThis.process.env.VERCEL_ENV === 'production'
    ? productionApiOrigin
    : developmentApiOrigin;
}

export default {
  async fetch(request: Request): Promise<Response> {
    const incomingUrl = new URL(request.url);
    const targetUrl = new URL(`${incomingUrl.pathname}${incomingUrl.search}`, apiOrigin());
    const headers = new Headers(request.headers);

    // Let fetch generate headers appropriate for the upstream host and body.
    headers.delete('host');
    headers.delete('content-length');

    return fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      redirect: 'manual',
      duplex: 'half',
    });
  },
};
