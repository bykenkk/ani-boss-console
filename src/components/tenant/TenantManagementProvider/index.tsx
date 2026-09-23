import { useState, type ReactNode } from "react";
import { TenantManagementContext } from "@/hooks/useTenantManagement";
import { createTenantManagementStore } from "@/stores/tenant-management";

export function TenantManagementProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createTenantManagementStore);
  return (
    <TenantManagementContext.Provider value={store}>{children}</TenantManagementContext.Provider>
  );
}
