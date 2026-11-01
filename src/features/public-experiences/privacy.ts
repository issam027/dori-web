function consumeOpaqueToken(search: string, history: Pick<History, 'replaceState'>) {
  const params = new URLSearchParams(search);
  const token = params.get('token')?.trim() ?? '';
  if (params.has('token')) {
    params.delete('token');
    const suffix = params.toString();
    history.replaceState(
      null,
      '',
      `${location.pathname}${suffix ? `?${suffix}` : ''}${location.hash}`,
    );
  }
  return token;
}

let activeTrackingToken = '';

export function consumeOrRestoreOpaqueToken(
  search: string,
  history: Pick<History, 'replaceState'>,
) {
  const token = consumeOpaqueToken(search, history);
  if (token) activeTrackingToken = token;
  return token || activeTrackingToken;
}

export const trackingProgress = (position?: number) => {
  if (position === undefined || position < 1) return 0;
  return Math.round(100 / position);
};

export function isPublicDisplaySnapshot(value: unknown): boolean {
  const forbidden = new Set(['firstname', 'lastname', 'email', 'phone', 'phonenumber', 'birthdate', 'personid']);
  const seen = new WeakSet();
  const inspect = (node: unknown): boolean => {
    if (!node || typeof node !== 'object') return true;
    if (seen.has(node)) return true;
    seen.add(node);
    return Object.entries(node).every(([key, child]) =>
      !forbidden.has(key.replace(/[_-]/g, '').toLowerCase()) && inspect(child));
  };
  return Boolean(value && typeof value === 'object' && inspect(value));
}
