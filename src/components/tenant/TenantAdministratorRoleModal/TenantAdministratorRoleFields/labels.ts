import type { TenantAdministratorRole } from "@/api/tenant";

export const tenantAdministratorRoleLabels: Record<TenantAdministratorRole, string> = {
  "tenant-admin": "租户管理员",
  user: "普通成员",
  auditor: "只读审计",
};
