import type { CursorPageParams } from "@/api/types";
import { fetchCursorPage, type CursorListResponse } from "./shared";
import { runIdempotentRequest } from "@/api/idempotency";
import { servicesRequest } from "@/api/request";
import { createIdempotencyScope } from "@/lib/idempotency";
import { fetchAllCursorPages, tenantAdministratorPath, tenantPath } from "./shared";
import type {
  InviteTenantAdministratorInput,
  ResetTenantAdministratorPasswordInput,
  TenantAdministratorAuditLog,
  TenantAdministratorDetail,
  TenantAdministratorListFilters,
  TenantAdministratorListItem,
  TenantAdministratorRole,
  TenantAdministratorSource,
  TenantAdministratorStatus,
  TenantInvitationResult,
  TenantReference,
  TenantRoleDefinition,
  UpdateTenantAdministratorRoleInput,
} from "./types";

interface TenantAdministratorResponse {
  id: string;
  email: string;
  username: string;
  display_name?: string | null;
  role: TenantAdministratorRole;
  status: TenantAdministratorStatus;
  is_inviting: boolean;
  is_expired: boolean;
  source: TenantAdministratorSource;
  last_login_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  tenant: { id: string; name: string; display_name: string };
}

const inviteAdministratorScope = createIdempotencyScope("tenant-admin-invite", ["POST"]);
const resendInvitationScope = createIdempotencyScope("tenant-admin-resend", ["POST"]);
const updateAdministratorRoleScope = createIdempotencyScope("tenant-admin-role", ["PUT"]);
const resetAdministratorPasswordScope = createIdempotencyScope("tenant-admin-password", ["POST"]);
const administratorStatusScope = createIdempotencyScope("tenant-admin-status", ["POST"]);

function mapAdministrator(item: TenantAdministratorResponse): TenantAdministratorListItem {
  return {
    id: item.id,
    email: item.email,
    username: item.username,
    displayName: item.display_name ?? null,
    role: item.role,
    status: item.status,
    isInviting: item.is_inviting,
    isExpired: item.is_expired,
    source: item.source,
    lastLoginAt: item.last_login_at ?? null,
    tenant: {
      id: item.tenant.id,
      name: item.tenant.name,
      displayName: item.tenant.display_name,
    },
  };
}

function mapAdministratorFilters(filters: TenantAdministratorListFilters) {
  return {
    tenant_id: filters.tenantId,
    status: filters.status,
    is_inviting: filters.isInviting,
    is_expired: filters.isExpired,
    search: filters.search,
    role: filters.role,
    source: filters.source,
  };
}

// FIXME(pagination-migration): 管理员详情仍通过全量列表查找所属租户，数据增长会增加加载耗时。
// 当前 /tenant-admins 无管理员 ID 精确筛选且详情要求 tenantId；后端补齐直接定位契约后移除全量查询，不以首屏未命中判定不存在。
export async function fetchTenantAdministrators(
  filters: TenantAdministratorListFilters = {},
): Promise<TenantAdministratorListItem[]> {
  const items = await fetchAllCursorPages<TenantAdministratorResponse>(
    "/tenant-admins",
    mapAdministratorFilters(filters),
  );
  return items.map(mapAdministrator);
}

// TODO(pagination-migration): 当前保留 ANI 游标契约；正式页码契约完成后迁移，当前按需查询单页。
export async function fetchTenantScopedAdministrators(
  tenantId: string,
  page: CursorPageParams = {},
  signal?: AbortSignal,
): Promise<CursorListResponse<TenantAdministratorListItem>> {
  const response = await fetchCursorPage<TenantAdministratorResponse>(
    tenantPath(tenantId, "/admins"),
    page,
    signal,
  );
  return { ...response, items: response.items.map(mapAdministrator) };
}

export async function fetchTenantAdministrator(
  tenantId: string,
  userId: string,
): Promise<TenantAdministratorDetail> {
  const response = await servicesRequest<TenantAdministratorResponse>(
    tenantAdministratorPath(tenantId, userId),
    { method: "GET" },
  );
  return {
    ...mapAdministrator(response),
    createdAt: response.created_at ?? null,
    updatedAt: response.updated_at ?? null,
  };
}

export async function fetchTenantAdministratorAvailableTenants(): Promise<TenantReference[]> {
  const response = await servicesRequest<{
    items: Array<{
      id: string;
      name: string;
      display_name?: string | null;
      status: "active" | "frozen";
    }>;
  }>("/tenant-admins/tenants", { method: "GET" });
  return response.items.map((item) => ({
    id: item.id,
    name: item.name,
    displayName: item.display_name ?? null,
    status: item.status,
  }));
}

export async function fetchTenantRoles(tenantId: string): Promise<TenantRoleDefinition[]> {
  const response = await servicesRequest<{
    items: Array<{
      id: string;
      tenant_id?: string | null;
      name: TenantAdministratorRole;
      permissions: Array<Record<string, unknown>>;
    }>;
  }>(tenantPath(tenantId, "/roles"), { method: "GET" });
  return response.items.map((item) => ({
    id: item.id,
    tenantId: item.tenant_id ?? null,
    name: item.name,
    permissions: item.permissions,
  }));
}

export function inviteTenantAdministrator(
  input: InviteTenantAdministratorInput,
): Promise<TenantInvitationResult> {
  return runIdempotentRequest(
    inviteAdministratorScope,
    { email: input.email, username: input.username },
    async (body) => {
      const response = await servicesRequest<
        {
          id: string;
          token: string;
          expire_at: string;
          message: string;
        },
        typeof body
      >(tenantPath(input.tenantId, "/admins/invite"), { method: "POST", data: body });
      return {
        id: response.id,
        token: response.token,
        expireAt: response.expire_at,
        message: response.message,
      };
    },
    [input.tenantId, input.email],
  );
}

export function resendTenantAdministratorInvitation(
  tenantId: string,
  userId: string,
): Promise<TenantInvitationResult> {
  return runIdempotentRequest(
    resendInvitationScope,
    {},
    async (body) => {
      const response = await servicesRequest<
        {
          id: string;
          token: string;
          expire_at: string;
          message: string;
        },
        typeof body
      >(tenantAdministratorPath(tenantId, userId, "/invitation/resend"), {
        method: "POST",
        data: body,
      });
      return {
        id: response.id,
        token: response.token,
        expireAt: response.expire_at,
        message: response.message,
      };
    },
    [tenantId, userId],
  );
}

export async function updateTenantAdministratorRole(
  input: UpdateTenantAdministratorRoleInput,
): Promise<void> {
  await runIdempotentRequest(
    updateAdministratorRoleScope,
    { role_id: input.roleId },
    (body) =>
      servicesRequest<unknown, typeof body>(
        tenantAdministratorPath(input.tenantId, input.userId, "/role"),
        { method: "PUT", data: body },
      ),
    [input.tenantId, input.userId],
  );
}

export async function resetTenantAdministratorPassword(
  input: ResetTenantAdministratorPasswordInput,
): Promise<void> {
  await runIdempotentRequest(
    resetAdministratorPasswordScope,
    { new_password: input.newPassword },
    (body) =>
      servicesRequest<unknown, typeof body>(
        tenantAdministratorPath(input.tenantId, input.userId, "/reset-password"),
        { method: "POST", data: body },
      ),
    [input.tenantId, input.userId],
  );
}

export async function updateTenantAdministratorStatus(
  tenantId: string,
  userId: string,
  action: "disable" | "enable",
): Promise<void> {
  await runIdempotentRequest(
    administratorStatusScope,
    {},
    (body) =>
      servicesRequest<unknown, typeof body>(
        tenantAdministratorPath(tenantId, userId, `/${action}`),
        { method: "POST", data: body },
      ),
    [tenantId, userId, action],
  );
}

export async function deleteTenantAdministrator(tenantId: string, userId: string): Promise<void> {
  await servicesRequest<unknown>(tenantAdministratorPath(tenantId, userId), {
    method: "DELETE",
  });
}

// TODO(pagination-migration): 当前保留 ANI 游标契约；正式页码契约完成后迁移，当前按需查询单页。
export async function fetchTenantAdministratorAuditLogs(
  tenantId: string,
  userId: string,
  page: CursorPageParams = {},
  signal?: AbortSignal,
): Promise<CursorListResponse<TenantAdministratorAuditLog>> {
  const response = await fetchCursorPage<{
    id: string;
    action: string;
    resource: string;
    result: "success" | "failure";
    user_id?: string | null;
    details?: Record<string, unknown> | null;
    created_at: string;
  }>(tenantAdministratorPath(tenantId, userId, "/audit-logs"), page, signal);
  return {
    ...response,
    items: response.items.map((item) => ({
      id: item.id,
      action: item.action,
      resource: item.resource,
      result: item.result,
      userId: item.user_id ?? null,
      details: item.details ?? null,
      createdAt: item.created_at,
    })),
  };
}
