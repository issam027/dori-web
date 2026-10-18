const normalizeTier = (value?: string) => value?.trim().toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') ?? '';

export function serviceTierVisualClass(tierId: number, codeOrName?: string): string {
  const tier = normalizeTier(codeOrName);
  if (tier.includes('free') || tier.includes('gratuit')) return 'service-tier-free';
  if (tier.includes('standard')) return 'service-tier-standard';
  if (tier.includes('premium')) return 'service-tier-premium';
  return `appointment-tier-${String(Math.abs(tierId - 1) % 6)}`;
}
