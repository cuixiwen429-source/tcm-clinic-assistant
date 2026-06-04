"use client";

import { useEffect } from "react";
import { useUIStore } from "@/stores/ui-store";

export function ElderlyModeProvider({ children }: { children: React.ReactNode }) {
  const elderlyMode = useUIStore((s) => s.elderlyMode);

  useEffect(() => {
    const root = document.documentElement;
    if (elderlyMode) {
      root.classList.add("elderly");
    } else {
      root.classList.remove("elderly");
    }
  }, [elderlyMode]);

  return <>{children}</>;
}
