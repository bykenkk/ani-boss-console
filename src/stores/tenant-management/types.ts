import type {
  Tenant,
  TenantAdmin,
  TenantAdminRole,
  TenantBilling,
  TenantDraft,
  TenantQuotaPackage,
  TenantQuotaRequestStatus,
  TenantSsoStatus,
  TenantStatus,
} from "@/components/tenant/model";

interface CreateTenantResult {
  ok: boolean;
  reason?: string;
  tenant?: Tenant;
}

export type TenantAdminAction =
  | "resend_invite"
  | "accept_invite"
  | "reset_password"
  | "change_role"
  | "disable"
  | "enable"
  | "transfer_owner"
  | "impersonate";

export interface TenantAdminActionResult {
  ok: boolean;
  reason?: string;
}

export type TenantBillingAction =
  | "refresh_usage"
  | "adjust_credit"
  | "generate_invoice"
  | "mark_settled"
  | "export_statement";

export interface TenantBillingActionResult {
  ok: boolean;
  reason?: string;
  message?: string;
}

export type TenantLifecycleAction =
  | "suspend"
  | "resume"
  | "disable"
  | "extend_trial"
  | "convert_trial"
  | "simulate_trial_expiry"
  | "update_arrears_policy"
  | "simulate_overdue";

export interface TenantLifecycleActionResult {
  ok: boolean;
  reason?: string;
  message?: string;
}

export interface TenantManagementState {
  tenants: Tenant[];
  tenantAdmins: TenantAdmin[];
  tenantBillings: TenantBilling[];
  quotaPackages: TenantQuotaPackage[];
  registerQuotaPackage: (quotaPackage: TenantQuotaPackage) => boolean;
  publishQuotaPackage: (planCode: string) => boolean;
  unregisterQuotaPackage: (planCode: string) => boolean;
  createTenant: (draft: TenantDraft) => CreateTenantResult;
  toggleTenantStatus: (tenantId: string) => TenantStatus | undefined;
  disableTenant: (tenantId: string) => boolean;
  updateTenantIdentity: (
    tenantId: string,
    patch: Partial<{
      ssoEnabled: boolean;
      ssoProvider: string;
      ssoStatus: TenantSsoStatus;
      ssoLastTestAt: string | undefined;
      forceMfa: boolean;
      region: string;
      regionName: string;
    }>,
  ) => boolean;
  rebindTenantQuotaPackage: (tenantId: string, planCode: string) => boolean;
  submitTenantQuotaRequest: (
    tenantId: string,
    draft: {
      requestedGpuHours: number;
      requestedStorageGi: number;
      reason: string;
      by: string;
    },
  ) => boolean;
  resolveTenantQuotaRequest: (
    tenantId: string,
    requestId: string,
    status: Extract<TenantQuotaRequestStatus, "approved" | "rejected">,
    rejectReason?: string,
  ) => boolean;
  refreshTenantUsage: (tenantId: string) => boolean;
  inviteTenantAdmin: (
    tenantId: string,
    draft: {
      name: string;
      displayName: string;
      email: string;
      role: TenantAdminRole;
    },
  ) => TenantAdminActionResult;
  applyTenantAdminAction: (
    adminId: string,
    action: TenantAdminAction,
    options?: { role?: TenantAdminRole; password?: string },
  ) => TenantAdminActionResult;
  applyTenantBillingAction: (
    tenantId: string,
    action: TenantBillingAction,
    options?: { amountUsd?: number; reason?: string },
  ) => TenantBillingActionResult;
  applyTenantLifecycleAction: (
    tenantId: string,
    action: TenantLifecycleAction,
    options?: {
      reason?: string;
      confirmName?: string;
      force?: boolean;
      planCode?: string;
      graceDays?: number;
      autoSuspend?: boolean;
      emailNotification?: boolean;
    },
  ) => TenantLifecycleActionResult;
}
