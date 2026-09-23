import { createStore } from "zustand/vanilla";
import {
  initialTenants,
  initialTenantAdmins,
  initialTenantBillings,
  tenantQuotaPackages,
} from "@/components/tenant/model";
import type { TenantManagementState } from "./types";
import { createQuotasSlice } from "./quotas";
import { createTenantsSlice } from "./tenants";
import { createAdministratorsSlice } from "./administrators";
import { createBillingSlice } from "./billing";
import { createLifecycleSlice } from "./lifecycle";

export type * from "./types";

export function createTenantManagementStore() {
  return createStore<TenantManagementState>()((...args) => ({
    tenants: initialTenants,
    tenantAdmins: initialTenantAdmins,
    tenantBillings: initialTenantBillings,
    quotaPackages: tenantQuotaPackages,
    ...createQuotasSlice(...args),
    ...createTenantsSlice(...args),
    ...createAdministratorsSlice(...args),
    ...createBillingSlice(...args),
    ...createLifecycleSlice(...args),
  }));
}
