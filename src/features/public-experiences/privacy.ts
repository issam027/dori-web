export function consumeOpaqueToken(search: string, history: Pick<History, 'replaceState'>) {
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
  if (!value || typeof value !== 'object') return false;
  const keys = JSON.stringify(value).toLowerCase();
  return !['firstname', 'lastname', 'email', 'phone', 'birthdate', 'personid'].some((key) =>
    keys.includes(key),
  );
}
