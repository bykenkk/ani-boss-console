import type { StateCreator } from "zustand/vanilla";
import type { TenantManagementState } from "./types";
import { formatCurrentDateTime, getCurrentTimestamp } from "@/lib/date";
import { appendTenantOperation } from "./operations";

export const createQuotasSlice: StateCreator<
  TenantManagementState,
  [],
  [],
  Pick<
    TenantManagementState,
    | "registerQuotaPackage"
    | "publishQuotaPackage"
    | "unregisterQuotaPackage"
    | "rebindTenantQuotaPackage"
    | "submitTenantQuotaRequest"
    | "resolveTenantQuotaRequest"
  >
> = (set, get) => ({
  registerQuotaPackage: (quotaPackage) => {
    const { quotaPackages } = get();
    if (
      quotaPackages.some(
        (item) => item.planCode.toLowerCase() === quotaPackage.planCode.toLowerCase(),
      )
    ) {
      return false;
    }
    set(({ quotaPackages: current }) => ({ quotaPackages: [quotaPackage, ...current] }));
    return true;
  },
  publishQuotaPackage: (planCode) => {
    const { quotaPackages } = get();
    if (!quotaPackages.some((item) => item.planCode === planCode)) {
      return false;
    }
    set(({ quotaPackages: current }) => ({
      quotaPackages: current.map((item) =>
        item.planCode === planCode
          ? { ...item, status: "enabled", updatedAt: formatCurrentDateTime() }
          : item,
      ),
    }));
    return true;
  },
  unregisterQuotaPackage: (planCode) => {
    const { tenants } = get();
    if (tenants.some((tenant) => tenant.planCode === planCode)) {
      return false;
    }
    set(({ quotaPackages: current }) => ({
      quotaPackages: current.filter((item) => item.planCode !== planCode),
    }));
    return true;
  },
  rebindTenantQuotaPackage: (tenantId, planCode) => {
    const { tenants, quotaPackages } = get();
    const quotaPackage = quotaPackages.find(
      (item) => item.planCode === planCode && item.status === "enabled",
    );
    if (!quotaPackage || !tenants.some((tenant) => tenant.id === tenantId)) {
      return false;
    }
    set(({ tenants: current }) => ({
      tenants: current.map((tenant) =>
        tenant.id === tenantId
          ? appendTenantOperation(
              {
                ...tenant,
                quotaPackage: quotaPackage.name,
                planCode: quotaPackage.planCode,
                isTrial: quotaPackage.isTrial,
              },
              "rebind_quota",
              `改绑配额策略 ${quotaPackage.name}（保留现有配额上限）`,
            )
          : tenant,
      ),
    }));
    return true;
  },
  submitTenantQuotaRequest: (tenantId, draft) => {
    const { tenants } = get();
    const currentTenant = tenants.find((tenant) => tenant.id === tenantId);
    if (!currentTenant) return false;
    set(({ tenants: current }) => ({
      tenants: current.map((tenant) =>
        tenant.id === tenantId
          ? appendTenantOperation(
              {
                ...tenant,
                quotaRequests: [
                  {
                    id: `qr-${getCurrentTimestamp()}`,
                    status: "pending",
                    requestedAt: formatCurrentDateTime(),
                    by: draft.by,
                    reason: draft.reason,
                    currentGpuHours: tenant.quotaLimits.gpuHours,
                    requestedGpuHours: draft.requestedGpuHours,
                    currentStorageGi: tenant.quotaLimits.storageGi,
                    requestedStorageGi: draft.requestedStorageGi,
                  },
                  ...tenant.quotaRequests,
                ],
              },
              "submit_quota_request",
              "提交配额扩容申请",
              draft.by,
            )
          : tenant,
      ),
    }));
    return true;
  },
  resolveTenantQuotaRequest: (tenantId, requestId, requestStatus, rejectReason) => {
    const { tenants } = get();
    const currentTenant = tenants.find((tenant) => tenant.id === tenantId);
    const request = currentTenant?.quotaRequests.find(
      (item) => item.id === requestId && item.status === "pending",
    );
    if (!currentTenant || !request) return false;
    set(({ tenants: current }) => ({
      tenants: current.map((tenant) => {
        if (tenant.id !== tenantId) return tenant;
        return appendTenantOperation(
          {
            ...tenant,
            quotaLimits:
              requestStatus === "approved"
                ? {
                    ...tenant.quotaLimits,
                    gpuHours: request.requestedGpuHours,
                    storageGi: request.requestedStorageGi,
                  }
                : tenant.quotaLimits,
            quotaRequests: tenant.quotaRequests.map((item) =>
              item.id === requestId
                ? {
                    ...item,
                    status: requestStatus,
                    resolvedAt: formatCurrentDateTime(),
                    rejectReason: requestStatus === "rejected" ? rejectReason : undefined,
                  }
                : item,
            ),
          },
          requestStatus === "approved" ? "approve_quota_request" : "reject_quota_request",
          requestStatus === "approved"
            ? "配额扩容申请已通过"
            : `配额扩容申请已驳回${rejectReason ? `：${rejectReason}` : ""}`,
        );
      }),
    }));
    return true;
  },
});
