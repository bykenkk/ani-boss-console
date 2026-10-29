import { createContext, useContext } from "react";
import type { AppBreadcrumbNavigation } from "@/lib/navigation";

export const BreadcrumbNavigationContext = createContext<
  ((navigation: AppBreadcrumbNavigation | null) => void) | null
>(null);

export function useNavigationContext() {
  return useContext(BreadcrumbNavigationContext);
}
