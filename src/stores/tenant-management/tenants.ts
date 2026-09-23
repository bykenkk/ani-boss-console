import type { StateCreator } from "zustand/vanilla";
import type { TenantManagementState } from "./types";
import {
  formatCurrentDate,
  formatCurrentDateTime,
  formatCurrentMonth,
  getCurrentTimestamp,
} from "@/lib/date";
import { getTenantUsageBreakdown, tenantRegions, type Tenant } from "@/components/tenant/model";
import { createBillingOperation, createLifecycleEvent, appendTenantOperation } from "./operations";

export const createTenantsSlice: StateCreator<
  TenantManagementState,
  [],
  [],
  Pick<
    TenantManagementState,
    | "createTenant"
    | "toggleTenantStatus"
    | "disableTenant"
    | "updateTenantIdentity"
    | "refreshTenantUsage"
  >
> = (set, get) => ({
  createTenant: (draft) => {
    const { tenants, quotaPackages } = get();
    if (tenants.some((tenant) => tenant.name === draft.name.trim())) {
      return { ok: false, reason: "租户标识已存在" };
    }

    const region = tenantRegions.find((item) => item.value === draft.region);
    const quotaPackage =
      quotaPackages.find((item) => item.status === "enabled" && item.name === draft.quotaPackage) ??
      quotaPackages[0];
    const tenantId = `tn-${getCurrentTimestamp()}`;
    const tenant: Tenant = {
      id: tenantId,
      name: draft.name.trim(),
      displayName: draft.displayName.trim(),
      status: "active",
      specification: "-",
      quotaPackage: quotaPackage.name,
      planCode: quotaPackage.planCode,
      memberCount: 0,
      adminCount: draft.adminEmail ? 1 : 0,
      balanceUsd: 0,
      creditUsd: 0,
      region: draft.region,
      regionName: region?.label ?? draft.region,
      isTrial: draft.isTrial || quotaPackage.isTrial,
      createdAt: formatCurrentDateTime(),
      contact: draft.contact.trim(),
      industry: draft.industry.trim() || "通用",
      ssoEnabled: false,
      ssoProvider: "-",
      ssoStatus: "disconnected",
      forceMfa: false,
      arrearsPolicy: {
        graceDays: 7,
        autoSuspend: true,
        emailNotification: true,
      },
      lifecycle: [
        {
          id: `lifecycle-${tenantId}-created`,
          at: formatCurrentDateTime(),
          event: "created",
          by: "system",
          message: "租户开通",
        },
      ],
      operations: [
        {
          id: `operation-${tenantId}-created`,
          operation: "create",
          status: "success",
          message: "租户开通完成",
          createdAt: formatCurrentDateTime(),
          by: "platform-admin",
        },
      ],
      resourceSummary: { vms: 0, inferences: 0, models: 0, kbs: 0 },
      usage: {
        gpuHours: 0,
        cpuHours: 0,
        storageGi: 0,
        tokens: 0,
        kbQueries: 0,
      },
      quotaLimits: { ...quotaPackage.limits },
      quotaRequests: [],
    };

    set(({ tenants: current }) => ({ tenants: [tenant, ...current] }));
    set(({ tenantBillings: current }) => ({
      tenantBillings: [
        {
          id: `billing-${tenantId}`,
          tenantId,
          tenantName: tenant.name,
          status: "current",
          period: formatCurrentMonth(),
          usageCostUsd: 0,
          creditUsd: 0,
          balanceUsd: 0,
          dueDate: "-",
          usageBreakdown: getTenantUsageBreakdown(tenant.usage),
          adjustments: [],
          invoices: [],
          operations: [
            createBillingOperation("开通计费账户", `创建 ${tenant.name} 计费账户`, "system"),
          ],
          updatedAt: formatCurrentDateTime(),
        },
        ...current,
      ],
    }));
    if (draft.adminEmail.trim()) {
      set(({ tenantAdmins: current }) => ({
        tenantAdmins: [
          {
            id: `tadm-${getCurrentTimestamp()}`,
            tenantId,
            tenantName: tenant.name,
            name: draft.adminName.trim() || draft.adminEmail.split("@")[0],
            displayName: draft.adminName.trim() || draft.adminEmail.split("@")[0],
            email: draft.adminEmail.trim(),
            role: "租户所有者",
            status: "invited",
            source: "本地",
            lastLogin: "-",
            mfa: false,
            invitedAt: formatCurrentDate(),
          },
          ...current,
        ],
      }));
    }
    return { ok: true, tenant };
  },
  toggleTenantStatus: (tenantId) => {
    const { tenants } = get();
    const currentTenant = tenants.find((tenant) => tenant.id === tenantId);
    if (!currentTenant || currentTenant.status === "disabled") return;
    if (currentTenant.status === "suspended" && currentTenant.balanceUsd < 0) {
      return;
    }
    const nextStatus = currentTenant.status === "suspended" ? "active" : "suspended";
    set(({ tenants: current }) => ({
      tenants: current.map((tenant) =>
        tenant.id === tenantId
          ? appendTenantOperation(
              {
                ...tenant,
                status: nextStatus,
                suspendedAt: nextStatus === "suspended" ? formatCurrentDateTime() : undefined,
                suspendReason: nextStatus === "suspended" ? "运营冻结" : undefined,
                lifecycle: [
                  createLifecycleEvent(
                    nextStatus === "suspended" ? "suspended" : "resumed",
                    nextStatus === "suspended" ? "运营冻结" : "解冻恢复",
                  ),
                  ...tenant.lifecycle,
                ],
              },
              nextStatus === "suspended" ? "suspend" : "resume",
              nextStatus === "suspended" ? "运营冻结" : "解冻恢复",
            )
          : tenant,
      ),
    }));
    return nextStatus;
  },
  disableTenant: (tenantId) => {
    const { tenants } = get();
    if (!tenants.some((tenant) => tenant.id === tenantId)) return false;
    set(({ tenants: current }) => ({
      tenants: current.map((tenant) =>
        tenant.id === tenantId
          ? appendTenantOperation(
              {
                ...tenant,
                status: "disabled",
                adminCount: 0,
                disabledAt: formatCurrentDateTime(),
                resourceSummary: {
                  vms: 0,
                  inferences: 0,
                  models: 0,
                  kbs: 0,
                },
                lifecycle: [
                  createLifecycleEvent("disabled", "租户禁用并清理名下资源"),
                  ...tenant.lifecycle,
                ],
              },
              "disable",
              "租户禁用，名下资源已清理",
            )
          : tenant,
      ),
    }));
    return true;
  },
  updateTenantIdentity: (tenantId, patch) => {
    const { tenants } = get();
    if (!tenants.some((tenant) => tenant.id === tenantId)) return false;
    set(({ tenants: current }) => ({
      tenants: current.map((tenant) =>
        tenant.id === tenantId
          ? appendTenantOperation({ ...tenant, ...patch }, "update_profile", "租户资料已更新")
          : tenant,
      ),
    }));
    return true;
  },
  refreshTenantUsage: (tenantId) => {
    const { tenants } = get();
    if (!tenants.some((tenant) => tenant.id === tenantId)) return false;
    set(({ tenants: current }) => ({
      tenants: current.map((tenant) =>
        tenant.id === tenantId
          ? appendTenantOperation(
              {
                ...tenant,
                usage: {
                  ...tenant.usage,
                  gpuHours: Math.round(tenant.usage.gpuHours * 1.02 + 3),
                  cpuHours: Math.round(tenant.usage.cpuHours * 1.01 + 10),
                  tokens: Math.round(tenant.usage.tokens * 1.03 + 1000),
                },
              },
              "refresh_usage",
              "租户用量已刷新",
            )
          : tenant,
      ),
    }));
    return true;
  },
});
