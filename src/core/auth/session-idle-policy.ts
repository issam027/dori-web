const defaultIdleMinutes = 30;

export function sessionIdleMilliseconds(configuredMinutes?: string): number {
  const minutes = Number(configuredMinutes);
  return Number.isFinite(minutes) && minutes > 0 ? minutes * 60_000 : defaultIdleMinutes * 60_000;
}
