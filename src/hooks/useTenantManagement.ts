import { createContext, useContext } from "react";
import { useStore } from "zustand";
import type { createTenantManagementStore } from "@/stores/tenant-management";

export const TenantManagementContext = createContext<ReturnType<
  typeof createTenantManagementStore
> | null>(null);

export function useTenantManagement() {
  const context = useContext(TenantManagementContext);
  if (!context) {
    throw new Error("useTenantManagement 必须在 TenantManagementProvider 内使用");
  }
  return useStore(context);
}
