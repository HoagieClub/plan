import { create } from 'zustand';

import type { MobileMenuState } from '../types';

const useMobileMenuStore = create<MobileMenuState>((set) => ({
  mobileMenuOpen: false,
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
}));

export default useMobileMenuStore;
