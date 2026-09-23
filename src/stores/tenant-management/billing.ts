import type { StateCreator } from "zustand/vanilla";
import type { TenantManagementState } from "./types";
import {
  formatCurrentDateTime,
  formatDate,
  formatMonth,
  formatShortYearMonth,
  getCurrentTimestamp,
} from "@/lib/date";
import { getTenantUsageBreakdown } from "@/components/tenant/model";
import { createBillingOperation, createLifecycleEvent } from "./operations";

export const createBillingSlice: StateCreator<
  TenantManagementState,
  [],
  [],
  Pick<TenantManagementState, "applyTenantBillingAction">
> = (set, get) => ({
  applyTenantBillingAction: (tenantId, action, options = {}) => {
    const { tenants, tenantBillings } = get();
    const tenant = tenants.find((item) => item.id === tenantId);
    const billing = tenantBillings.find((item) => item.tenantId === tenantId);
    if (!tenant || !billing) {
      return { ok: false, reason: "未找到租户计费账户" };
    }

    if (action === "refresh_usage") {
      const nextUsage = {
        ...tenant.usage,
        gpuHours: Math.round(tenant.usage.gpuHours * 1.02 + 3),
        cpuHours: Math.round(tenant.usage.cpuHours * 1.01 + 10),
        tokens: Math.round(tenant.usage.tokens * 1.03 + 1000),
      };
      const usageBreakdown = getTenantUsageBreakdown(nextUsage);
      const usageCostUsd = Number(
        usageBreakdown.reduce((total, item) => total + item.cost, 0).toFixed(2),
      );
      set(({ tenants: current }) => ({
        tenants: current.map((item) =>
          item.id === tenantId ? { ...item, usage: nextUsage } : item,
        ),
      }));
      set(({ tenantBillings: current }) => ({
        tenantBillings: current.map((item) =>
          item.tenantId === tenantId
            ? {
                ...item,
                usageCostUsd,
                usageBreakdown,
                operations: [
                  createBillingOperation(
                    "刷新用量",
                    `更新 ${item.period} 账期用量与费用`,
                    "system",
                  ),
                  ...item.operations,
                ],
                updatedAt: formatCurrentDateTime(),
              }
            : item,
        ),
      }));
      return { ok: true, message: "本期用量与费用已刷新" };
    }

    if (action === "adjust_credit") {
      const amountUsd = Number(options.amountUsd) || 0;
      if (!amountUsd) {
        return { ok: false, reason: "调账金额不能为 0" };
      }
      const reason = options.reason?.trim() || "人工调账";
      const nextBalance = Number((billing.balanceUsd + amountUsd).toFixed(2));
      const nextCredit = Number((billing.creditUsd + Math.max(0, amountUsd)).toFixed(2));
      const nextStatus = nextBalance < 0 ? "overdue" : amountUsd > 0 ? "credited" : billing.status;
      set(({ tenantBillings: current }) => ({
        tenantBillings: current.map((item) =>
          item.tenantId === tenantId
            ? {
                ...item,
                status: nextStatus,
                balanceUsd: nextBalance,
                creditUsd: nextCredit,
                adjustments: [
                  {
                    id: `adjustment-${getCurrentTimestamp()}`,
                    at: formatCurrentDateTime(),
                    amountUsd,
                    reason,
                    by: "finance",
                  },
                  ...item.adjustments,
                ],
                operations: [
                  createBillingOperation(
                    "授信调账",
                    `${amountUsd > 0 ? "+" : ""}${amountUsd} USD · ${reason}`,
                    "finance",
                  ),
                  ...item.operations,
                ],
                updatedAt: formatCurrentDateTime(),
              }
            : item,
        ),
      }));
      set(({ tenants: current }) => ({
        tenants: current.map((item) =>
          item.id === tenantId
            ? {
                ...item,
                balanceUsd: nextBalance,
                creditUsd: nextCredit,
              }
            : item,
        ),
      }));
      return { ok: true, message: "授信调账已生效" };
    }

    if (action === "generate_invoice") {
      const issuedAt = formatCurrentDateTime();
      const invoiceNo = `INV-${formatShortYearMonth(issuedAt)}-${String(Math.floor(Math.random() * 90) + 10)}`;
      set(({ tenantBillings: current }) => ({
        tenantBillings: current.map((item) =>
          item.tenantId === tenantId
            ? {
                ...item,
                status: "current",
                invoiceNo,
                invoices: [
                  {
                    id: `invoice-${getCurrentTimestamp()}`,
                    no: invoiceNo,
                    period: item.period,
                    amountUsd: item.usageCostUsd,
                    status: "issued",
                    issuedAt: formatDate(issuedAt),
                  },
                  ...item.invoices,
                ],
                operations: [
                  createBillingOperation(
                    "生成账单",
                    `${invoiceNo} · ${item.usageCostUsd} USD`,
                    "finance",
                  ),
                  ...item.operations,
                ],
                updatedAt: formatCurrentDateTime(),
              }
            : item,
        ),
      }));
      return { ok: true, message: `账单 ${invoiceNo} 已生成` };
    }

    if (action === "mark_settled") {
      const nextBalance = Math.max(0, billing.balanceUsd);
      const shouldResume = tenant.status === "suspended" && billing.balanceUsd < 0;
      set(({ tenantBillings: current }) => ({
        tenantBillings: current.map((item) =>
          item.tenantId === tenantId
            ? {
                ...item,
                status: "settled",
                balanceUsd: nextBalance,
                operations: [
                  createBillingOperation(
                    "标记结清",
                    `${item.period} 账期已完成线下结算`,
                    "finance",
                  ),
                  ...item.operations,
                ],
                updatedAt: formatCurrentDateTime(),
              }
            : item,
        ),
      }));
      set(({ tenants: current }) => ({
        tenants: current.map((item) =>
          item.id === tenantId
            ? {
                ...item,
                balanceUsd: nextBalance,
                status: shouldResume ? "active" : item.status,
                suspendedAt: shouldResume ? undefined : item.suspendedAt,
                suspendReason: shouldResume ? undefined : item.suspendReason,
                lifecycle: shouldResume
                  ? [
                      createLifecycleEvent("resumed", "欠费账单结清，自动解冻", "system"),
                      ...item.lifecycle,
                    ]
                  : item.lifecycle,
              }
            : item,
        ),
      }));
      return { ok: true, message: "账单已标记结清" };
    }

    if (action === "export_statement") {
      set(({ tenantBillings: current }) => ({
        tenantBillings: current.map((item) =>
          item.tenantId === tenantId
            ? {
                ...item,
                operations: [
                  createBillingOperation("导出对账单", `${item.period} 账期对账单`, "finance"),
                  ...item.operations,
                ],
                updatedAt: formatCurrentDateTime(),
              }
            : item,
        ),
      }));
      return {
        ok: true,
        message: `已导出 ${tenant.name} ${formatMonth(billing.period)} 对账单`,
      };
    }

    return { ok: false, reason: "不支持的计费操作" };
  },
});
