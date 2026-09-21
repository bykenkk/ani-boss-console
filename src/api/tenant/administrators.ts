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
  TenantMutationResult,
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

export async function fetchTenantAdministrators(
  filters: TenantAdministratorListFilters = {},
): Promise<TenantAdministratorListItem[]> {
  const items = await fetchAllCursorPages<TenantAdministratorResponse>(
    "/tenant-admins",
    mapAdministratorFilters(filters),
  );
  return items.map(mapAdministrator);
}

export async function fetchTenantScopedAdministrators(
  tenantId: string,
): Promise<TenantAdministratorListItem[]> {
  const items = await fetchAllCursorPages<TenantAdministratorResponse>(
    tenantPath(tenantId, "/admins"),
  );
  return items.map(mapAdministrator);
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

export function updateTenantAdministratorRole(
  input: UpdateTenantAdministratorRoleInput,
): Promise<TenantMutationResult> {
  return runIdempotentRequest(
    updateAdministratorRoleScope,
    { role_id: input.roleId },
    (body) =>
      servicesRequest<TenantMutationResult, typeof body>(
        tenantAdministratorPath(input.tenantId, input.userId, "/role"),
        { method: "PUT", data: body },
      ),
    [input.tenantId, input.userId],
  );
}

export function resetTenantAdministratorPassword(
  input: ResetTenantAdministratorPasswordInput,
): Promise<TenantMutationResult> {
  return runIdempotentRequest(
    resetAdministratorPasswordScope,
    { new_password: input.newPassword },
    (body) =>
      servicesRequest<TenantMutationResult, typeof body>(
        tenantAdministratorPath(input.tenantId, input.userId, "/reset-password"),
        { method: "POST", data: body },
      ),
    [input.tenantId, input.userId],
  );
}

export function updateTenantAdministratorStatus(
  tenantId: string,
  userId: string,
  action: "disable" | "enable",
): Promise<TenantMutationResult> {
  return runIdempotentRequest(
    administratorStatusScope,
    {},
    (body) =>
      servicesRequest<TenantMutationResult, typeof body>(
        tenantAdministratorPath(tenantId, userId, `/${action}`),
        { method: "POST", data: body },
      ),
    [tenantId, userId, action],
  );
}

export function deleteTenantAdministrator(
  tenantId: string,
  userId: string,
): Promise<TenantMutationResult> {
  return servicesRequest<TenantMutationResult>(tenantAdministratorPath(tenantId, userId), {
    method: "DELETE",
  });
}

export async function fetchTenantAdministratorAuditLogs(
  tenantId: string,
  userId: string,
): Promise<TenantAdministratorAuditLog[]> {
  const items = await fetchAllCursorPages<{
    id: string;
    action: string;
    resource: string;
    result: "success" | "failure";
    user_id?: string | null;
    details?: Record<string, unknown> | null;
    created_at: string;
  }>(tenantAdministratorPath(tenantId, userId, "/audit-logs"));
  return items.map((item) => ({
    id: item.id,
    action: item.action,
    resource: item.resource,
    result: item.result,
    userId: item.user_id ?? null,
    details: item.details ?? null,
    createdAt: item.created_at,
  }));
}
