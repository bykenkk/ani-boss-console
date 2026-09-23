import { createContext } from "react";
import type { AppBreadcrumbNavigation } from "./index";

export const BreadcrumbNavigationContext = createContext<
  ((navigation: AppBreadcrumbNavigation | null) => void) | null
>(null);
