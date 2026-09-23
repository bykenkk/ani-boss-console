import { useState, type ReactNode } from "react";
import { PlatformOverviewContext } from "@/hooks/usePlatformOverview";
import { createPlatformOverviewStore } from "@/stores/platform-overview";

export function PlatformOverviewProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createPlatformOverviewStore);

  return (
    <PlatformOverviewContext.Provider value={store}>{children}</PlatformOverviewContext.Provider>
  );
}
