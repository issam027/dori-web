import { create } from 'zustand';
import type { SiteResponseDto } from '@/api/generated/models';

interface BrandState {
  name: string;
  logoUrl: string | null;
  applySite: (site: SiteResponseDto) => void;
  reset: () => void;
}

export const useBrandStore = create<BrandState>((set) => ({
  name: 'DORIFY',
  logoUrl: null,
  applySite: (site) => {
    set({ name: site.siteName, logoUrl: site.siteLogoUrl ?? null });
  },
  reset: () => {
    set({ name: 'DORIFY', logoUrl: null });
  },
}));
