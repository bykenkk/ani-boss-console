import type { ReactNode } from "react";
import type { AppBreadcrumbNavigation } from "@/lib/navigation";

import { BreadcrumbNavigationContext } from "@/hooks/useNavigationContext";

interface BreadcrumbNavigationProviderProps {
  children: ReactNode;
  onChange: (navigation: AppBreadcrumbNavigation | null) => void;
}

export function BreadcrumbNavigationProvider({
  children,
  onChange,
}: BreadcrumbNavigationProviderProps) {
  return (
    <BreadcrumbNavigationContext.Provider value={onChange}>
      {children}
    </BreadcrumbNavigationContext.Provider>
  );
}
