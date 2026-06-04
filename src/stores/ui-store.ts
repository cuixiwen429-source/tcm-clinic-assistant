import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  elderlyMode: boolean;
  toggleElderlyMode: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      elderlyMode: false,
      toggleElderlyMode: () => set((s) => ({ elderlyMode: !s.elderlyMode })),
    }),
    { name: "ui-preferences" }
  )
);
