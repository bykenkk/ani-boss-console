import type { PageParams } from "@/api/types";

export interface Plan {
  id: number;
  name?: string;
  version?: "FREE" | "STANDARD" | "ENTERPRISE";
  expiryPolicy?: "READONLY" | "BLOCK_LOGIN" | "FREEZE";
  dataRetentionDays?: number;
  description?: string;
  remark?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlanList<T> {
  items?: T[];
  total: string;
}

export interface PlanListInput extends PageParams {
  search?: string;
}

export interface CreatePlanInput {
  name: string;
  version?: Plan["version"];
  expiryPolicy?: Plan["expiryPolicy"];
  dataRetentionDays?: number;
  description?: string;
  remark?: string;
}

export type UpdatePlanInput = Partial<CreatePlanInput>;

export interface PlanQuota {
  id: number;
  planId?: number;
  quotaCode?: string;
  quotaValue?: string;
  /** @deprecated 仅旧三项的兼容投影，展示与提交使用 quotaCode。 */
  quotaType?: string;
}

export interface CreatePlanQuotaInput {
  planId: number;
  quotaCode: string;
  quotaValue: string;
}

export interface UpdatePlanQuotaInput {
  quotaCode?: string;
  quotaValue?: string;
}

export type QuotaEnforcement =
  | "ENFORCEMENT_UNSPECIFIED"
  | "LEGACY_CONFIG_ONLY"
  | "LAB_ONLY"
  | "ENFORCED"
  | "NOT_ENABLED";

export interface QuotaDefinition {
  code?: string;
  displayName?: string;
  unit?: string;
  accountingKind?: "ACCOUNTING_KIND_UNSPECIFIED" | "CONCURRENT" | "COUNTER";
  enforcement?: QuotaEnforcement;
}

export type PlanModuleCode =
  | "DASHBOARD"
  | "OPM"
  | "SYSTEM"
  | "DICT"
  | "TENANT"
  | "PERMISSION"
  | "LOG"
  | "INTERNAL_MESSAGE"
  | "TASK"
  | "MODEL"
  | "NETWORK"
  | "ACCELERATOR"
  | "IMAGE"
  | "INFERENCE"
  | "INSTANCE";

export interface PlanModule {
  id: number;
  planId?: number;
  module?: PlanModuleCode;
}

export interface CreatePlanModuleInput {
  planId: number;
  module: PlanModuleCode;
}

export interface UpdatePlanModuleInput {
  module: PlanModuleCode;
}

export interface TenantUsage {
  tenantId?: number;
  userCount?: string;
  storageUsedBytes?: string;
  apiCallCount?: string;
  planId?: number;
  planName?: string;
  quotas?: Array<{ quotaCode?: string; quotaValue?: string; quotaType?: string }>;
}

export interface QuotaAccount {
  quotaCode?: string;
  unit?: string;
  limit?: string;
  occupied?: string;
  available?: string;
  overLimit?: boolean;
  enforcement?: QuotaEnforcement;
}

export interface TenantQuotaAccounts {
  tenantId?: number;
  items?: QuotaAccount[];
}
