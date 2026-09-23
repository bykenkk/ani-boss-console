import { useContext, useLayoutEffect } from "react";
import { BreadcrumbNavigationContext } from "./context";
import type { AppBreadcrumbNavigation } from "./index";

export function useBreadcrumbNavigation(navigation: AppBreadcrumbNavigation) {
  const setNavigation = useContext(BreadcrumbNavigationContext);

  useLayoutEffect(() => {
    if (!setNavigation) return undefined;

    setNavigation(navigation);
    return () => setNavigation(null);
  }, [navigation, setNavigation]);
}
