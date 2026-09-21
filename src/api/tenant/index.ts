import { ApiError } from "@/api/request";

export * from "./administrators";
export * from "./plans";
export * from "./tenants";
export * from "./types";

export const tenantManagementQueryKeys = {
  all: ["tenant-management"] as const,
  tenants: ["tenant-management", "tenants"] as const,
  tenantList: (filters: object = {}) => ["tenant-management", "tenants", "list", filters] as const,
  tenantDetail: (tenantId: string) => ["tenant-management", "tenants", "detail", tenantId] as const,
  availablePlans: ["tenant-management", "tenants", "available-plans"] as const,
  tenantAuth: (tenantId: string) => ["tenant-management", "tenants", tenantId, "auth"] as const,
  tenantQuota: (tenantId: string) => ["tenant-management", "tenants", tenantId, "quota"] as const,
  tenantQuotaRequests: (tenantId: string) =>
    ["tenant-management", "tenants", tenantId, "quota-requests"] as const,
  tenantLifecycle: (tenantId: string) =>
    ["tenant-management", "tenants", tenantId, "lifecycle"] as const,
  tenantAudit: (tenantId: string) => ["tenant-management", "tenants", tenantId, "audit"] as const,
  tenantScopedAdministrators: (tenantId: string) =>
    ["tenant-management", "tenants", tenantId, "administrators"] as const,
  plans: ["tenant-management", "plans"] as const,
  planList: (filters: object = {}) => ["tenant-management", "plans", "list", filters] as const,
  planDetail: (planId: string) => ["tenant-management", "plans", "detail", planId] as const,
  planLimits: (planId: string) => ["tenant-management", "plans", planId, "limits"] as const,
  planBoundTenants: (planId: string) =>
    ["tenant-management", "plans", planId, "bound-tenants"] as const,
  planBindableTenants: (planId: string) =>
    ["tenant-management", "plans", planId, "bindable-tenants"] as const,
  planAudit: (planId: string) => ["tenant-management", "plans", planId, "audit"] as const,
  quotaMeta: ["tenant-management", "quota-meta"] as const,
  administrators: ["tenant-management", "administrators"] as const,
  administratorList: (filters: object = {}) =>
    ["tenant-management", "administrators", "list", filters] as const,
  administratorDetail: (tenantId: string, userId: string) =>
    ["tenant-management", "administrators", tenantId, userId] as const,
  administratorTenants: ["tenant-management", "administrators", "tenants"] as const,
  administratorRoles: (tenantId: string) =>
    ["tenant-management", "administrators", tenantId, "roles"] as const,
  administratorAudit: (tenantId: string, userId: string) =>
    ["tenant-management", "administrators", tenantId, userId, "audit"] as const,
};

const errorMessages: Record<string, string> = {
  VALIDATION_FAILED: "提交内容不符合要求，请检查后重试",
  TENANT_NOT_FOUND: "租户不存在或已被移除",
  TENANT_NAME_CONFLICT: "租户标识已存在",
  PLAN_NOT_ACTIVE: "所选套餐未发布，不能用于开通或绑定",
  TENANT_STATE_INVALID: "当前租户状态不允许执行此操作",
  TENANT_HAS_RUNNING_RESOURCES: "租户仍有运行中的资源，暂不能禁用",
  TENANT_SSO_CONFIG_INVALID: "SSO 配置不完整或不可用",
  QUOTA_CHANGE_REQUEST_CONFLICT: "该配额申请已存在，请刷新后重试",
  QUOTA_CHANGE_REQUEST_INVALID: "配额申请包含重复或无效维度",
  QUOTA_CHANGE_REQUEST_NOT_FOUND: "配额申请不存在",
  QUOTA_CHANGE_REQUEST_NOT_PENDING: "该配额申请已处理",
  QUOTA_RESOURCE_NOT_REGISTERED: "配额维度未启用",
  TENANT_PLAN_NOT_FOUND: "配额套餐不存在或已被删除",
  PLAN_CODE_CONFLICT: "套餐编码已存在",
  PLAN_STATE_INVALID: "当前套餐状态不允许执行此操作",
  TENANT_PLAN_IN_USE: "套餐仍有关联租户，不能删除",
  TENANT_ADMIN_NOT_FOUND: "租户管理员不存在",
  TENANT_ADMIN_ALREADY_ADMIN: "该用户已经是租户管理员",
  TENANT_INVITATION_PENDING: "该邮箱已有待处理邀请",
  TENANT_ADMIN_INVITATION_NOT_FOUND: "管理员邀请不存在",
  TENANT_INVITATION_SETTLED: "该邀请已处理，不能重发",
  ROLE_CHANGE_INVALID: "当前管理员状态不允许修改角色",
  PASSWORD_SAME_AS_OLD: "新密码不能与原密码相同",
  IDEMPOTENCY_KEY_REUSED: "请求内容与上次提交不一致，请重新操作",
  IDEMPOTENCY_CONFLICT: "请求正在处理中，请稍后重试",
  FORBIDDEN: "当前账号没有执行此操作的权限",
};

export function getTenantManagementErrorMessage(error: unknown) {
  const code = error instanceof ApiError ? error.code : undefined;
  return (
    (code && errorMessages[code]) ||
    (error instanceof Error && error.message.trim()) ||
    "租户管理操作失败，请稍后重试"
  );
}
