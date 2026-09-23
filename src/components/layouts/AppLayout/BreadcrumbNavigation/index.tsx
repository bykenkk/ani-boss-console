import type { ReactNode } from "react";
import { BreadcrumbNavigationContext } from "@/hooks/useBreadcrumbNavigation";
import type { AppBreadcrumbNavigation } from "@/lib/navigation";

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
