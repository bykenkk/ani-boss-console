import { createContext, useContext } from "react";
import { useStore } from "zustand";
import type { createPlatformOverviewStore } from "@/stores/platform-overview";

export const PlatformOverviewContext = createContext<ReturnType<
  typeof createPlatformOverviewStore
> | null>(null);

export function usePlatformOverview() {
  const context = useContext(PlatformOverviewContext);
  if (!context) {
    throw new Error("usePlatformOverview 必须在 PlatformOverviewProvider 内使用");
  }
  return useStore(context);
}
