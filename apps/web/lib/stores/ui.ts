import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SidebarState = 'expanded' | 'collapsed' | 'hidden';

export interface ModalConfig {
  isOpen: boolean;
  type?: string;
  data?: Record<string, unknown>;
}

interface UIState {
  sidebarState: SidebarState;
  isMobileMenuOpen: boolean;
  isCommandPaletteOpen: boolean;
  activeModal: ModalConfig;
  theme: 'light' | 'dark' | 'system';
  tableDensity: 'comfortable' | 'compact' | 'spacious';
  
  setSidebarState: (state: SidebarState) => void;
  toggleSidebar: () => void;
  setMobileMenuOpen: (isOpen: boolean) => void;
  toggleMobileMenu: () => void;
  setCommandPaletteOpen: (isOpen: boolean) => void;
  toggleCommandPalette: () => void;
  openModal: (type: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setTableDensity: (density: 'comfortable' | 'compact' | 'spacious') => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarState: 'expanded',
      isMobileMenuOpen: false,
      isCommandPaletteOpen: false,
      activeModal: { isOpen: false },
      theme: 'system',
      tableDensity: 'comfortable',

      setSidebarState: (state) => {
        set({ sidebarState: state });
      },

      toggleSidebar: () => {
        const current = get().sidebarState;
        set({
          sidebarState: current === 'expanded' ? 'collapsed' : 'expanded',
        });
      },

      setMobileMenuOpen: (isOpen) => {
        set({ isMobileMenuOpen: isOpen });
      },

      toggleMobileMenu: () => {
        set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen }));
      },

      setCommandPaletteOpen: (isOpen) => {
        set({ isCommandPaletteOpen: isOpen });
      },

      toggleCommandPalette: () => {
        set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen }));
      },

      openModal: (type, data = {}) => {
        set({ activeModal: { isOpen: true, type, data } });
      },

      closeModal: () => {
        set({ activeModal: { isOpen: false } });
      },

      setTheme: (theme) => {
        set({ theme });
      },

      setTableDensity: (density) => {
        set({ tableDensity: density });
      },
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        sidebarState: state.sidebarState,
        theme: state.theme,
        tableDensity: state.tableDensity,
      }),
    }
  )
);

export function useUI() {
  const {
    sidebarState,
    isMobileMenuOpen,
    isCommandPaletteOpen,
    activeModal,
    theme,
    tableDensity,
    setSidebarState,
    toggleSidebar,
    setMobileMenuOpen,
    toggleMobileMenu,
    setCommandPaletteOpen,
    toggleCommandPalette,
    openModal,
    closeModal,
    setTheme,
    setTableDensity,
  } = useUIStore();

  return {
    sidebarState,
    isMobileMenuOpen,
    isCommandPaletteOpen,
    activeModal,
    theme,
    tableDensity,
    setSidebarState,
    toggleSidebar,
    setMobileMenuOpen,
    toggleMobileMenu,
    setCommandPaletteOpen,
    toggleCommandPalette,
    openModal,
    closeModal,
    setTheme,
    setTableDensity,
  };
}
