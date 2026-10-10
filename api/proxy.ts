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

  // Le chemin d'origine arrive dans __path (ex: "v1/health").
  const originalPath = incomingUrl.searchParams.get('__path') ?? '';

  // Supprime les paramètres ajoutés par le rewrite Vercel.
  incomingUrl.searchParams.delete('__path');
  incomingUrl.searchParams.delete('path');
  const query = incomingUrl.searchParams.toString();

  const path = `${basePath}/api/${originalPath}`;
  return new URL(`${path}${query ? `?${query}` : ''}`, configuredBase.origin);
}

async function proxy(request: Request): Promise<Response> {
  const targetUrl = upstreamUrl(request.url);
  const headers = new Headers(request.headers);

  // Let fetch generate headers appropriate for the upstream host and body.
  headers.delete('host');
  headers.delete('content-length');
  // Demande une réponse non compressée à l'API.
  headers.delete('accept-encoding');

  const init: RequestInit & { duplex?: 'half' } = {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    redirect: 'manual',
    duplex: 'half',
  };

  const upstream = await fetch(targetUrl, init);

  // Le corps est déjà décodé par fetch : ces en-têtes ne sont plus valides.
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete('content-encoding');
  responseHeaders.delete('content-length');
  responseHeaders.delete('transfer-encoding');

  // Conserve tous les cookies, y compris plusieurs Set-Cookie.
  responseHeaders.delete('set-cookie');
  for (const cookie of upstream.headers.getSetCookie()) {
    responseHeaders.append('set-cookie', cookie);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
export const HEAD = proxy;