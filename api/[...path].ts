function apiBaseUrl(): URL {
  const configuredUrl = globalThis.process.env.VITE_API_BASE_URL;
  if (!configuredUrl) {
    throw new Error('VITE_API_BASE_URL is required by the API proxy');
  }
  const url = new URL(configuredUrl);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('VITE_API_BASE_URL must use HTTP or HTTPS');
  }
  return url;
}

function upstreamUrl(requestUrl: string): URL {
  const incomingUrl = new URL(requestUrl);
  const configuredBase = apiBaseUrl();
  const basePath = configuredBase.pathname.replace(/\/$/, '');
  const incomingPath = incomingUrl.pathname;
  const path = basePath && incomingPath.startsWith(`${basePath}/`)
    ? incomingPath
    : `${basePath}${incomingPath}`;
  return new URL(`${path}${incomingUrl.search}`, configuredBase.origin);
}

async function proxy(request: Request): Promise<Response> {
  const targetUrl = upstreamUrl(request.url);
  const headers = new Headers(request.headers);

  // Let fetch generate headers appropriate for the upstream host and body.
  headers.delete('host');
  headers.delete('content-length');

  const init: RequestInit & { duplex?: 'half' } = {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    redirect: 'manual',
    duplex: 'half',
  };

  return fetch(targetUrl, init);
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
export const HEAD = proxy;