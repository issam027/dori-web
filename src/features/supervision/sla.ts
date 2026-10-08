export function slaTone(
  waitingCount: number,
  estimatedMinutes: number,
): 'success' | 'warning' | 'danger' {
  if (estimatedMinutes >= 30 || waitingCount >= 15) return 'danger';
  if (estimatedMinutes >= 15 || waitingCount >= 8) return 'warning';
  return 'success';
}
