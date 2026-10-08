import { create } from 'zustand';
import type { SiteResponseDto } from '@/api/generated/models';

interface BrandState {
  name: string;
  logoUrl: string | null;
  applySite: (site: SiteResponseDto) => void;
  reset: () => void;
}

export const useBrandStore = create<BrandState>((set) => ({
  name: 'DORI',
  logoUrl: null,
  applySite: (site) => {
    set({ name: site.siteName, logoUrl: site.siteLogoUrl ?? null });
  },
  reset: () => {
    set({ name: 'DORI', logoUrl: null });
  },
}));
