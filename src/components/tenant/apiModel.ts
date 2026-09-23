import type { StatusBadgeTone } from "@/components/common";
import type {
  QuotaChangeRequestStatus,
  TenantAdministratorRole,
  TenantAdministratorSource,
  TenantAdministratorStatus,
  TenantPlanStatus,
  TenantStatus,
} from "@/api/tenant";

export const tenantStatusMeta: Record<TenantStatus, { label: string; tone: StatusBadgeTone }> = {
  active: { label: "活跃", tone: "success" },
  frozen: { label: "冻结", tone: "warning" },
  disabled: { label: "禁用", tone: "default" },
};

export const tenantPlanStatusMeta: Record<
  TenantPlanStatus,
  { label: string; tone: StatusBadgeTone }
> = {
  draft: { label: "草稿", tone: "warning" },
  active: { label: "已发布", tone: "success" },
  disabled: { label: "已停用", tone: "default" },
};

export const tenantAdministratorStatusMeta: Record<
  TenantAdministratorStatus,
  { label: string; tone: StatusBadgeTone }
> = {
  active: { label: "活跃", tone: "success" },
  disabled: { label: "已禁用", tone: "default" },
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
  { label: string; tone: StatusBadgeTone }
> = {
  pending: { label: "待审批", tone: "warning" },
  approved: { label: "已通过", tone: "success" },
  rejected: { label: "已驳回", tone: "danger" },
};

export const tenantLifecycleActionLabels = {
  create: "租户开通",
  freeze: "租户冻结",
  unfreeze: "租户解冻",
  disable: "租户禁用",
} as const;

export const tenantAuditActionLabels: Record<string, string> = {
  "tenant.bind_plan_quota": "绑定配额策略",
  "tenant.create": "创建租户",
  "tenant.disable": "禁用租户",
  "tenant.freeze": "冻结租户",
  "tenant.mfa.update": "更新 MFA 设置",
  "tenant.quota_change_request.apply_failed": "应用配额调整失败",
  "tenant.quota_change_request.apply_retry": "重试应用配额调整",
  "tenant.quota_change_request.approve": "通过配额调整",
  "tenant.quota_change_request.reject": "驳回配额调整",
  "tenant.quota_change_request.review": "处理配额调整",
  "tenant.quota_change_request.submit": "提交配额调整",
  "tenant.quota_init_failed": "初始化租户配额失败",
  "tenant.sso.update": "更新 SSO 配置",
  "tenant.unfreeze": "解冻租户",
  "tenant.update": "更新租户信息",
  "tenant_admin.change_role": "调整租户管理员角色",
  "tenant_admin.delete": "删除租户管理员",
  "tenant_admin.disable": "禁用租户管理员",
  "tenant_admin.enable": "启用租户管理员",
  "tenant_admin.invite": "邀请租户管理员",
  "tenant_admin.resend_invitation": "重发租户管理员邀请",
  "tenant_admin.reset_password": "重置租户管理员密码",
  "tenant_plan.activate": "发布配额策略",
  "tenant_plan.create": "创建配额策略",
  "tenant_plan.delete": "删除配额策略",
  "tenant_plan.disable": "停用配额策略",
  "tenant_plan.update": "更新配额策略",
  "tenant_plan.update_quota_limits": "更新配额策略上限",
};
