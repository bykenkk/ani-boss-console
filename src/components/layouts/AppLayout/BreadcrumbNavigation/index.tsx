import type { ReactNode } from "react";
import type { AppRoute } from "../navigation";
import { BreadcrumbNavigationContext } from "./context";

export interface AppBreadcrumbItem {
  label: ReactNode;
  to?: AppRoute;
  onClick?: () => void;
}

export interface AppBreadcrumbNavigation {
  items: AppBreadcrumbItem[];
  onBack?: () => void;
}

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
