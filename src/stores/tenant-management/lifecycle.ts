import type { StateCreator } from "zustand/vanilla";
import type { TenantManagementState } from "./types";
import { addDaysToFutureDateTime, formatCurrentDateTime } from "@/lib/date";
import { createLifecycleEvent, appendTenantOperation } from "./operations";

export const createLifecycleSlice: StateCreator<
  TenantManagementState,
  [],
  [],
  Pick<TenantManagementState, "applyTenantLifecycleAction">
> = (set, get) => ({
  applyTenantLifecycleAction: (tenantId, action, options = {}) => {
    const { tenants, quotaPackages } = get();
    const tenant = tenants.find((item) => item.id === tenantId);
    if (!tenant) return { ok: false, reason: "租户不存在" };

    if (action === "suspend") {
      if (tenant.status !== "active") {
        return { ok: false, reason: "仅活跃租户可以冻结" };
      }
      const reason = options.reason?.trim() || "运营冻结";
      const suspendedAt = formatCurrentDateTime();
      set(({ tenants: current }) => ({
        tenants: current.map((item) =>
          item.id === tenantId
            ? appendTenantOperation(
                {
                  ...item,
                  status: "suspended",
                  suspendedAt,
                  suspendReason: reason,
                  lifecycle: [createLifecycleEvent("suspended", reason), ...item.lifecycle],
                },
                "suspend",
                reason,
              )
            : item,
        ),
      }));
      return { ok: true, message: "租户已冻结" };
    }

    if (action === "resume") {
      if (tenant.status !== "suspended") {
        return { ok: false, reason: "仅冻结租户可以解冻" };
      }
      if (tenant.balanceUsd < 0 && options.force !== true) {
        return {
          ok: false,
          reason: "账户仍欠费，请先调账或勾选强制解冻",
        };
      }
      set(({ tenants: current }) => ({
        tenants: current.map((item) =>
          item.id === tenantId
            ? appendTenantOperation(
                {
                  ...item,
                  status: "active",
                  suspendedAt: undefined,
                  suspendReason: undefined,
                  lifecycle: [createLifecycleEvent("resumed", "解冻恢复"), ...item.lifecycle],
                },
                "resume",
                options.force ? "强制解冻恢复" : "解冻恢复",
              )
            : item,
        ),
      }));
      return { ok: true, message: "租户已解冻" };
    }

    if (action === "disable") {
      if (tenant.status === "disabled") {
        return { ok: false, reason: "租户已禁用" };
      }
      if (options.confirmName?.trim() !== tenant.name) {
        return { ok: false, reason: "请输入正确的租户标识" };
      }
      const disabledAt = formatCurrentDateTime();
      const reason = options.reason?.trim() || "租户禁用并清理名下资源";
      set(({ tenants: current }) => ({
        tenants: current.map((item) =>
          item.id === tenantId
            ? appendTenantOperation(
                {
                  ...item,
                  status: "disabled",
                  adminCount: 0,
                  disabledAt,
                  resourceSummary: {
                    vms: 0,
                    inferences: 0,
                    models: 0,
                    kbs: 0,
                  },
                  lifecycle: [createLifecycleEvent("disabled", reason), ...item.lifecycle],
                },
                "disable",
                reason,
              )
            : item,
        ),
      }));
      return { ok: true, message: "租户已禁用，名下资源已清理" };
    }

    if (action === "extend_trial") {
      if (!tenant.isTrial) {
        return { ok: false, reason: "仅试用租户可以延期" };
      }
      const trialEndsAt = addDaysToFutureDateTime(tenant.trialEndsAt, 14);
      set(({ tenants: current }) => ({
        tenants: current.map((item) =>
          item.id === tenantId
            ? appendTenantOperation(
                {
                  ...item,
                  trialEndsAt,
                  lifecycle: [
                    createLifecycleEvent(
                      "trial_extended",
                      `试用延期 14 天，新的到期时间 ${trialEndsAt}`,
                    ),
                    ...item.lifecycle,
                  ],
                },
                "extend_trial",
                `试用延期至 ${trialEndsAt}`,
              )
            : item,
        ),
      }));
      return { ok: true, message: `试用已延期至 ${trialEndsAt}` };
    }

    if (action === "convert_trial") {
      if (!tenant.isTrial) {
        return { ok: false, reason: "仅试用租户可以转正式" };
      }
      const quotaPackage = quotaPackages.find(
        (item) =>
          item.planCode === (options.planCode || "std") &&
          item.status === "enabled" &&
          !item.isTrial,
      );
      if (!quotaPackage) {
        return { ok: false, reason: "请选择已发布的正式配额策略" };
      }
      set(({ tenants: current }) => ({
        tenants: current.map((item) =>
          item.id === tenantId
            ? appendTenantOperation(
                {
                  ...item,
                  isTrial: false,
                  trialEndsAt: undefined,
                  quotaPackage: quotaPackage.name,
                  planCode: quotaPackage.planCode,
                  lifecycle: [
                    createLifecycleEvent(
                      "trial_converted",
                      `试用转正式，改绑配额策略 ${quotaPackage.name}（保留现有配额上限）`,
                    ),
                    ...item.lifecycle,
                  ],
                },
                "convert_trial",
                `试用转正式，改绑配额策略 ${quotaPackage.name}`,
              )
            : item,
        ),
      }));
      return { ok: true, message: "租户已转为正式租户" };
    }

    if (action === "simulate_trial_expiry") {
      if (!tenant.isTrial) {
        return { ok: false, reason: "仅试用租户可以模拟到期" };
      }
      if (tenant.status === "disabled") {
        return { ok: false, reason: "禁用租户不能模拟到期" };
      }
      const suspendedAt = formatCurrentDateTime();
      set(({ tenants: current }) => ({
        tenants: current.map((item) =>
          item.id === tenantId
            ? appendTenantOperation(
                {
                  ...item,
                  status: "suspended",
                  suspendedAt,
                  suspendReason: "试用到期自动冻结",
                  lifecycle: [
                    createLifecycleEvent("trial_expired", "试用到期，租户自动冻结", "system"),
                    ...item.lifecycle,
                  ],
                },
                "simulate_trial_expiry",
                "试用到期，租户自动冻结",
                "system",
              )
            : item,
        ),
      }));
      return { ok: true, message: "已模拟试用到期并自动冻结" };
    }

    if (action === "update_arrears_policy") {
      const graceDays = Number(options.graceDays);
      if (!Number.isFinite(graceDays) || graceDays < 0) {
        return { ok: false, reason: "宽限天数不能小于 0" };
      }
      const autoSuspend = options.autoSuspend ?? true;
      const emailNotification = options.emailNotification ?? true;
      set(({ tenants: current }) => ({
        tenants: current.map((item) =>
          item.id === tenantId
            ? appendTenantOperation(
                {
                  ...item,
                  arrearsPolicy: {
                    graceDays: Math.round(graceDays),
                    autoSuspend,
                    emailNotification,
                  },
                  lifecycle: [
                    createLifecycleEvent(
                      "arrears_policy_updated",
                      `欠费宽限 ${Math.round(graceDays)} 天 · 自动冻结${autoSuspend ? "开启" : "关闭"} · 邮件通知${emailNotification ? "开启" : "关闭"}`,
                    ),
                    ...item.lifecycle,
                  ],
                },
                "update_arrears_policy",
                `欠费宽限 ${Math.round(graceDays)} 天 · 自动冻结${autoSuspend ? "开启" : "关闭"} · 邮件通知${emailNotification ? "开启" : "关闭"}`,
              )
            : item,
        ),
      }));
      return { ok: true, message: "欠费策略已更新" };
    }

    if (action === "simulate_overdue") {
      if (tenant.status === "disabled") {
        return { ok: false, reason: "禁用租户不能模拟欠费" };
      }
      const nextBalance = tenant.balanceUsd < 0 ? tenant.balanceUsd : -100;
      const autoSuspend = tenant.arrearsPolicy.autoSuspend;
      set(({ tenantBillings: current }) => ({
        tenantBillings: current.map((item) =>
          item.tenantId === tenantId
            ? {
                ...item,
                status: "overdue",
                balanceUsd: nextBalance,
                updatedAt: formatCurrentDateTime(),
              }
            : item,
        ),
      }));
      set(({ tenants: current }) => ({
        tenants: current.map((item) =>
          item.id === tenantId
            ? appendTenantOperation(
                {
                  ...item,
                  balanceUsd: nextBalance,
                  status: autoSuspend ? "suspended" : item.status,
                  suspendedAt: autoSuspend ? formatCurrentDateTime() : item.suspendedAt,
                  suspendReason: autoSuspend ? "欠费自动冻结" : item.suspendReason,
                  lifecycle: [
                    createLifecycleEvent(
                      autoSuspend ? "overdue_suspended" : "overdue_detected",
                      autoSuspend
                        ? `超过 ${item.arrearsPolicy.graceDays} 天宽限期，欠费自动冻结`
                        : "检测到欠费，自动冻结策略未开启",
                      "system",
                    ),
                    ...item.lifecycle,
                  ],
                },
                "simulate_overdue",
                autoSuspend ? "检测到欠费，租户自动冻结" : "检测到欠费，自动冻结策略未开启",
                "system",
              )
            : item,
        ),
      }));
      return {
        ok: true,
        message: autoSuspend ? "已模拟欠费并自动冻结租户" : "已模拟欠费，当前策略未自动冻结租户",
      };
    }

    return { ok: false, reason: "不支持的生命周期操作" };
  },
});
