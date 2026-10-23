const normalizeTier = (value?: string) =>
  value
    ?.trim()
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') ?? '';

export function serviceTierVisualClass(tierId: string, codeOrName?: string): string {
  const tier = normalizeTier(codeOrName);
  if (tier.includes('free') || tier.includes('gratuit')) return 'service-tier-free';
  if (tier.includes('standard')) return 'service-tier-standard';
  if (tier.includes('premium')) return 'service-tier-premium';
  let hash = 0;
  for (let index = 0; index < tierId.length; index += 1) {
    hash = hash * 31 + tierId.charCodeAt(index);
  }
  return `appointment-tier-${String(Math.abs(hash) % 6)}`;
}
