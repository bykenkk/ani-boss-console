import type {
  QuotaChangeRequestStatus,
  TenantAdministratorRole,
  TenantAdministratorSource,
  TenantAdministratorStatus,
  TenantPlanStatus,
  TenantStatus,
} from "@/api/tenant";

export const tenantStatusMeta: Record<TenantStatus, { label: string; color: string }> = {
  active: { label: "活跃", color: "green" },
  frozen: { label: "冻结", color: "orange" },
  disabled: { label: "禁用", color: "gray" },
};

export const tenantPlanStatusMeta: Record<TenantPlanStatus, { label: string; color: string }> = {
  draft: { label: "草稿", color: "orange" },
  active: { label: "已发布", color: "green" },
  disabled: { label: "已停用", color: "gray" },
};

export const tenantAdministratorStatusMeta: Record<
  TenantAdministratorStatus,
  { label: string; color: string }
> = {
  active: { label: "活跃", color: "green" },
  disabled: { label: "已禁用", color: "gray" },
};

export const tenantAdministratorRoleLabels: Record<TenantAdministratorRole, string> = {
  "tenant-admin": "租户管理员",
  user: "普通成员",
  auditor: "只读审计",
};

export const tenantAdministratorSourceLabels: Record<TenantAdministratorSource, string> = {
  local: "本地",
  third_party: "第三方",
};

export const quotaRequestStatusMeta: Record<
  QuotaChangeRequestStatus,
  { label: string; color: string }
> = {
  pending: { label: "待审批", color: "orange" },
  approved: { label: "已通过", color: "green" },
  rejected: { label: "已驳回", color: "red" },
};

export const tenantLifecycleActionLabels = {
  create: "租户开通",
  freeze: "租户冻结",
  unfreeze: "租户解冻",
  disable: "租户禁用",
} as const;
