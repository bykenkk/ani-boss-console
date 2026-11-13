export type Resource = "tenants" | "users" | "roles" | "permissions" | "permission-groups" | "apis";
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
// 按当前已确认的租户列表、详情响应字段维护，独立于写入字段和通用管理资源类型。
export interface ManagedTenant {
  id: number;
  name?: string;
  code?: string;
  type?: "TENANT_TYPE_UNSPECIFIED" | "TRIAL" | "PAID" | "INTERNAL" | "PARTNER" | "CUSTOM";
  status?: EnabledStatus | "EXPIRED" | "FREEZE";
  planId?: number;
  adminUserId?: number;
  adminUserName?: string;
  memberCount?: number;
  createdBy?: number;
  createdAt?: string;
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
  moduleDescription?: string;
  businessModule?: string;
  scope?: "ADMIN" | "APP";
}
export interface ResourceRecords {
  tenants: ManagedTenant;
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
  total: string;
}
export type EditValues = Record<string, unknown>;
export interface SaveManagementInput {
  id?: number;
  values: EditValues;
}
// 写入字段按现有新建、编辑流程维护，不从读取响应类型派生。
interface TenantInput {
  name?: string;
  code?: string;
  type?: ManagedTenant["type"];
  status?: ManagedTenant["status"];
  auditStatus?: "TENANT_AUDIT_STATUS_UNSPECIFIED" | "PENDING" | "APPROVED" | "REJECTED";
  planId?: number;
  expiredAt?: string | null;
  remark?: string;
}
export interface TenantWithAdministratorInput {
  tenant: TenantInput;
  user: Pick<ManagedUser, "username" | "email" | "realname">;
  password: string;
}
