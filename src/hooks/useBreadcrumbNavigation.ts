import { createContext, useContext, useLayoutEffect } from "react";
import type { AppBreadcrumbNavigation } from "@/lib/navigation";

export const BreadcrumbNavigationContext = createContext<
  ((navigation: AppBreadcrumbNavigation | null) => void) | null
>(null);

export function useBreadcrumbNavigation(navigation: AppBreadcrumbNavigation) {
  const setNavigation = useContext(BreadcrumbNavigationContext);

  useLayoutEffect(() => {
    if (!setNavigation) return undefined;

    setNavigation(navigation);
    return () => setNavigation(null);
  }, [navigation, setNavigation]);
}
