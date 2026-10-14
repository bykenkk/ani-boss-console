export type Resource =
  | "tenants"
  | "plans"
  | "plan-quotas"
  | "users"
  | "roles"
  | "permissions"
  | "permission-groups"
  | "apis";
export type EnabledStatus = "ON" | "OFF";
export interface ManagementRecord {
  id: number;
  name?: string;
  code?: string;
  description?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}
export interface ManagedTenant extends ManagementRecord {
  type?: "TRIAL" | "PAID" | "INTERNAL" | "PARTNER" | "CUSTOM";
  status?: EnabledStatus | "EXPIRED" | "FREEZE";
  domain?: string;
  industry?: string;
  remark?: string;
  planId?: number;
  adminUserId?: number;
  adminUserName?: string;
  expiredAt?: string;
  subscriptionPlan?: string;
  memberCount?: number;
  auditStatus?: "PENDING" | "APPROVED" | "REJECTED";
}
export interface ManagedPlan extends ManagementRecord {
  version?: "FREE" | "STANDARD" | "ENTERPRISE";
  expiryPolicy?: "READONLY" | "BLOCK_LOGIN" | "FREEZE";
  dataRetentionDays?: number;
  remark?: string;
}
export interface ManagedPlanQuota extends ManagementRecord {
  planId: number;
  quotaCode: string;
  quotaValue: string;
  quotaType?: string;
}
export interface ManagedUser extends ManagementRecord {
  tenantId?: number;
  tenantName?: string;
  username: string;
  nickname?: string;
  realname?: string;
  email?: string;
  mobile?: string;
  roleId?: number;
  roleIds?: number[];
  roleNames?: string[];
  roles?: string[];
  orgUnitIds?: number[];
  positionIds?: number[];
  status?: "DISABLED" | "NORMAL" | "PENDING" | "LOCKED" | "EXPIRED";
}
export interface ManagedRole extends ManagementRecord {
  tenantId?: number;
  tenantName?: string;
  type?: "SYSTEM" | "TEMPLATE" | "TENANT";
  isProtected?: boolean;
  sortOrder?: number;
  permissions?: number[];
  dataScope?: string;
  orgUnits?: number[];
  fieldPermissions?: Array<{ resource: string; hiddenFields: string[] }>;
}
export interface ManagedPermission extends ManagementRecord {
  groupId?: number;
  groupName?: string;
  apiIds?: number[];
  menuIds?: number[];
}
export interface ManagedPermissionGroup extends ManagementRecord {
  module?: string;
  parentId?: number;
  sortOrder?: number;
  children?: ManagedPermissionGroup[];
}
export interface ManagedApi extends ManagementRecord {
  operation?: string;
  path?: string;
  method?: string;
  module?: string;
  businessModule?: string;
  scope?: "ADMIN" | "APP";
}
export interface ResourceRecords {
  tenants: ManagedTenant;
  plans: ManagedPlan;
  "plan-quotas": ManagedPlanQuota;
  users: ManagedUser;
  roles: ManagedRole;
  permissions: ManagedPermission;
  "permission-groups": ManagedPermissionGroup;
  apis: ManagedApi;
}
export interface ManagementListInput {
  page?: number;
  pageSize?: number;
  noPaging?: boolean;
  filters?: Record<string, string | number | boolean | string[] | number[]>;
}
export interface ManagementList<T> {
  items: T[];
  total: number;
}
export type EditValues = Record<string, unknown>;
export interface SaveManagementInput {
  id?: number;
  values: EditValues;
}
export interface TenantWithAdministratorInput {
  tenant: Omit<ManagedTenant, "id">;
  user: Pick<ManagedUser, "username" | "email" | "realname">;
  password: string;
}
