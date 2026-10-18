import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAppStore = create(
  persist(
    (set) => ({
      // Auth State
      authToken: null,
      setAuthToken: (token) => set({ authToken: token }),
      logout: () => set({ authToken: null }),

      // Setup State
      isSetupComplete: false,
      setSetupComplete: (status) => set({ isSetupComplete: status }),

      // Sidebar display mode: 'hover' (expand on hover) | 'expanded' | 'collapsed'
      sidebarMode: 'hover',
      setSidebarMode: (mode) => set({ sidebarMode: mode }),

      // Demo Environment State
      isDemoEnvironment: false,
      setDemoEnvironment: (status) => set({ isDemoEnvironment: status }),
    }),
    {
      name: 'vertex-storage', // unique name for localStorage
      partialize: (state) => ({
        sidebarMode: state.sidebarMode,
        authToken: state.authToken,
        isSetupComplete: state.isSetupComplete,
        isDemoEnvironment: state.isDemoEnvironment,
      }), // Only persist these keys
    }
  )
);
