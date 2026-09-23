import type { StateCreator } from "zustand/vanilla";
import type { TenantManagementState } from "./types";
import { formatCurrentDate, formatCurrentDateTime, getCurrentTimestamp } from "@/lib/date";
import { appendTenantOperation } from "./operations";

export const createAdministratorsSlice: StateCreator<
  TenantManagementState,
  [],
  [],
  Pick<TenantManagementState, "inviteTenantAdmin" | "applyTenantAdminAction">
> = (set, get) => ({
  inviteTenantAdmin: (tenantId, draft) => {
    const { tenants, tenantAdmins } = get();
    const tenant = tenants.find((item) => item.id === tenantId);
    if (!tenant) return { ok: false, reason: "租户不存在" };
    if (tenant.status === "disabled") {
      return { ok: false, reason: "禁用租户不能邀请管理员" };
    }
    const email = draft.email.trim().toLowerCase();
    if (
      tenantAdmins.some(
        (admin) => admin.tenantId === tenantId && admin.email.toLowerCase() === email,
      )
    ) {
      return { ok: false, reason: "该邮箱已是当前租户管理员" };
    }
    if (tenant.adminCount >= tenant.quotaLimits.maxMembers) {
      return { ok: false, reason: "管理员数量已达到成员配额上限" };
    }
    set(({ tenantAdmins: current }) => ({
      tenantAdmins: [
        {
          id: `tadm-${getCurrentTimestamp()}`,
          tenantId,
          tenantName: tenant.name,
          name: draft.name.trim() || email.split("@")[0],
          displayName: draft.displayName.trim() || draft.name.trim() || email.split("@")[0],
          email,
          role: draft.role,
          status: "invited",
          source: "本地",
          lastLogin: "-",
          mfa: false,
          invitedAt: formatCurrentDate(),
        },
        ...current,
      ],
    }));
    set(({ tenants: current }) => ({
      tenants: current.map((item) =>
        item.id === tenantId
          ? appendTenantOperation(
              { ...item, adminCount: item.adminCount + 1 },
              "invite_admin",
              `邀请管理员 ${email}`,
            )
          : item,
      ),
    }));
    return { ok: true };
  },
  applyTenantAdminAction: (adminId, action, options = {}) => {
    const { tenants, tenantAdmins } = get();
    const admin = tenantAdmins.find((item) => item.id === adminId);
    if (!admin) return { ok: false, reason: "管理员不存在" };
    const tenant = tenants.find((item) => item.id === admin.tenantId);
    if (!tenant) return { ok: false, reason: "所属租户不存在" };
    const activeOwners = tenantAdmins.filter(
      (item) =>
        item.tenantId === tenant.id && item.role === "租户所有者" && item.status === "active",
    );
    const isOnlyActiveOwner =
      admin.role === "租户所有者" && admin.status === "active" && activeOwners.length === 1;

    if (action === "resend_invite") {
      if (admin.status !== "invited") {
        return { ok: false, reason: "仅邀请中的账号可以重发邀请" };
      }
      set(({ tenantAdmins: current }) => ({
        tenantAdmins: current.map((item) =>
          item.id === adminId ? { ...item, invitedAt: formatCurrentDate() } : item,
        ),
      }));
      return { ok: true };
    }

    if (action === "accept_invite") {
      if (admin.status !== "invited") {
        return { ok: false, reason: "该邀请无需再次接受" };
      }
      set(({ tenantAdmins: current }) => ({
        tenantAdmins: current.map((item) =>
          item.id === adminId
            ? {
                ...item,
                status: "active",
                lastLogin: formatCurrentDateTime(),
                mfa: tenant.forceMfa,
              }
            : item,
        ),
      }));
      set(({ tenants: current }) => ({
        tenants: current.map((item) =>
          item.id === tenant.id ? { ...item, memberCount: item.memberCount + 1 } : item,
        ),
      }));
      return { ok: true };
    }

    if (action === "reset_password") {
      if (admin.status === "invited") {
        return { ok: false, reason: "邀请中的账号请先接受邀请" };
      }
      if (admin.status === "disabled") {
        return { ok: false, reason: "已禁用账号不可重置密码" };
      }
      if (tenant.status !== "active") {
        return { ok: false, reason: "冻结或禁用租户不可重置密码" };
      }
      if (!options.password || options.password.length < 8) {
        return { ok: false, reason: "密码至少 8 位" };
      }
      set(({ tenantAdmins: current }) => ({
        tenantAdmins: current.map((item) =>
          item.id === adminId ? { ...item, lastResetAt: formatCurrentDateTime() } : item,
        ),
      }));
      return { ok: true };
    }

    if (action === "change_role") {
      if (!options.role) return { ok: false, reason: "请选择角色" };
      if (isOnlyActiveOwner && options.role !== "租户所有者") {
        return { ok: false, reason: "至少保留一名活跃的租户所有者" };
      }
      set(({ tenantAdmins: current }) => ({
        tenantAdmins: current.map((item) =>
          item.id === adminId ? { ...item, role: options.role! } : item,
        ),
      }));
      return { ok: true };
    }

    if (action === "disable") {
      if (isOnlyActiveOwner) {
        return { ok: false, reason: "至少保留一名活跃的租户所有者" };
      }
      set(({ tenantAdmins: current }) => ({
        tenantAdmins: current.map((item) =>
          item.id === adminId ? { ...item, status: "disabled" } : item,
        ),
      }));
      return { ok: true };
    }

    if (action === "enable") {
      if (tenant.status !== "active") {
        return { ok: false, reason: "冻结或禁用租户不能启用管理员" };
      }
      set(({ tenantAdmins: current }) => ({
        tenantAdmins: current.map((item) =>
          item.id === adminId ? { ...item, status: "active" } : item,
        ),
      }));
      return { ok: true };
    }

    if (action === "transfer_owner") {
      if (admin.status !== "active") {
        return { ok: false, reason: "仅活跃管理员可以接受所有者移交" };
      }
      if (isOnlyActiveOwner) {
        return { ok: false, reason: "该管理员已经是唯一所有者" };
      }
      set(({ tenantAdmins: current }) => ({
        tenantAdmins: current.map((item) => {
          if (item.tenantId !== tenant.id) return item;
          if (item.id === adminId) return { ...item, role: "租户所有者" };
          return item.role === "租户所有者" ? { ...item, role: "租户管理员" } : item;
        }),
      }));
      return { ok: true };
    }

    if (action === "impersonate") {
      if (tenant.status === "disabled") {
        return { ok: false, reason: "禁用租户不可模拟登录" };
      }
      if (admin.status !== "active") {
        return { ok: false, reason: "仅活跃管理员可以模拟登录" };
      }
      return { ok: true };
    }

    return { ok: false, reason: "不支持的管理员操作" };
  },
});
