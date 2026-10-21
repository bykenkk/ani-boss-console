import type { CursorPageParams } from "@/api/types";
import { runIdempotentRequest } from "@/api/idempotency";
import { ApiError, servicesRequest } from "@/api/request";
import { createIdempotencyScope } from "@/lib/idempotency";
import type {
  CreatePlatformAdministratorInput,
  PlatformAdministratorAuditLog,
  PlatformAdministratorDetail,
  PlatformAdministratorListFilters,
  PlatformAdministratorListItem,
  PlatformAdministratorRoleDefinition,
  ResetPlatformAdministratorPasswordInput,
  UpdatePlatformAdministratorRoleInput,
} from "./types";

interface PlatformAdministratorListItemResponse {
  id: string;
  username: string;
  display_name: string;
  role: PlatformAdministratorListItem["role"];
  status: PlatformAdministratorListItem["status"];
  source: PlatformAdministratorListItem["source"];
  last_login_at?: string | null;
}

interface PlatformAdministratorDetailResponse extends PlatformAdministratorListItemResponse {
  email: string;
  created_at: string;
}

interface CursorListResponse<T> {
  items: T[];
  next_cursor?: string | null;
}

interface PlatformRoleResponse {
  id: string;
  name: PlatformAdministratorRoleDefinition["name"];
}

interface PlatformAuditLogResponse {
  id: string;
  action: string;
  resource: string;
  result: PlatformAdministratorAuditLog["result"];
  details?: Record<string, unknown> | null;
  created_at: string;
}

const createScope = createIdempotencyScope("platform-admin-create", ["POST"]);
const updateRoleScope = createIdempotencyScope("platform-admin-role", ["PUT"]);
const resetPasswordScope = createIdempotencyScope("platform-admin-password", ["POST"]);
const disableScope = createIdempotencyScope("platform-admin-disable", ["POST"]);
const enableScope = createIdempotencyScope("platform-admin-enable", ["POST"]);
const deleteScope = createIdempotencyScope("platform-admin-delete", ["DELETE"]);

export const platformAdministratorQueryKeys = {
  all: ["platform-administrators"] as const,
  list: (filters: PlatformAdministratorListFilters = {}) =>
    ["platform-administrators", "list", filters] as const,
  detail: (userId: string) => ["platform-administrators", "detail", userId] as const,
  roles: ["platform-administrators", "roles"] as const,
  auditLogs: (userId: string) => ["platform-administrators", "audit-logs", userId] as const,
};

function platformAdministratorPath(userId: string, suffix = "") {
  return `/platform-admins/${encodeURIComponent(userId)}${suffix}`;
}

function mapListItem(item: PlatformAdministratorListItemResponse): PlatformAdministratorListItem {
  return {
    id: item.id,
    username: item.username,
    displayName: item.display_name,
    role: item.role,
    status: item.status,
    source: item.source,
    lastLoginAt: item.last_login_at ?? null,
  };
}

// TODO(pagination-migration): 当前保留 ANI 游标契约；正式页码契约完成后迁移，当前按需查询单页。
export async function fetchPlatformAdministrators(
  filters: PlatformAdministratorListFilters = {},
  page: CursorPageParams = {},
  signal?: AbortSignal,
): Promise<CursorListResponse<PlatformAdministratorListItem>> {
  const { roleId, ...params } = filters;
  const response = await servicesRequest<CursorListResponse<PlatformAdministratorListItemResponse>>(
    "/platform-admins",
    { params: { ...params, role_id: roleId, limit: 20, ...page }, signal },
  );
  return { ...response, items: response.items.map(mapListItem) };
}

export async function fetchPlatformAdministrator(
  userId: string,
): Promise<PlatformAdministratorDetail> {
  const item = await servicesRequest<PlatformAdministratorDetailResponse>(
    platformAdministratorPath(userId),
    { method: "GET" },
  );
  return { ...mapListItem(item), email: item.email, createdAt: item.created_at };
}

export async function fetchPlatformAdministratorRoles(): Promise<
  PlatformAdministratorRoleDefinition[]
> {
  const response = await servicesRequest<{ items: PlatformRoleResponse[] }>(
    "/platform-admins/roles",
    { method: "GET" },
  );
  return response.items.map((item) => ({
    id: item.id,
    name: item.name,
  }));
}

// TODO(pagination-migration): 当前保留 ANI 游标契约；正式页码契约完成后迁移，当前按需查询单页。
export async function fetchPlatformAdministratorAuditLogs(
  userId: string,
  page: CursorPageParams = {},
  signal?: AbortSignal,
): Promise<CursorListResponse<PlatformAdministratorAuditLog>> {
  const response = await servicesRequest<CursorListResponse<PlatformAuditLogResponse>>(
    platformAdministratorPath(userId, "/audit-logs"),
    { params: { limit: 20, ...page }, signal },
  );
  return {
    ...response,
    items: response.items.map((item) => ({
      id: item.id,
      action: item.action,
      resource: item.resource,
      result: item.result,
      details: item.details ?? null,
      createdAt: item.created_at,
    })),
  };
}

export async function createPlatformAdministrator(
  input: CreatePlatformAdministratorInput,
): Promise<void> {
  const { displayName, roleId, ...fields } = input;
  await runIdempotentRequest(
    createScope,
    { ...fields, display_name: displayName, role_id: roleId },
    (body) =>
      servicesRequest<unknown, typeof body>("/platform-admins", {
        method: "POST",
        data: body,
      }),
  );
}

export async function updatePlatformAdministratorRole({
  userId,
  roleId,
}: UpdatePlatformAdministratorRoleInput): Promise<void> {
  await runIdempotentRequest(
    updateRoleScope,
    { role_id: roleId },
    (body) =>
      servicesRequest<unknown, typeof body>(platformAdministratorPath(userId, "/role"), {
        method: "PUT",
        data: body,
      }),
    [userId],
  );
}

export async function resetPlatformAdministratorPassword({
  userId,
  newPassword,
}: ResetPlatformAdministratorPasswordInput): Promise<void> {
  await runIdempotentRequest(
    resetPasswordScope,
    { new_password: newPassword },
    (body) =>
      servicesRequest<unknown, typeof body>(platformAdministratorPath(userId, "/reset-password"), {
        method: "POST",
        data: body,
      }),
    [userId],
  );
}

async function runStatusOperation(userId: string, action: "disable" | "enable"): Promise<void> {
  const scope = action === "disable" ? disableScope : enableScope;
  await runIdempotentRequest(
    scope,
    {},
    (body) =>
      servicesRequest<unknown, typeof body>(platformAdministratorPath(userId, `/${action}`), {
        method: "POST",
        data: body,
      }),
    [userId],
  );
}

export function disablePlatformAdministrator(userId: string) {
  return runStatusOperation(userId, "disable");
}

export function enablePlatformAdministrator(userId: string) {
  return runStatusOperation(userId, "enable");
}

export async function deletePlatformAdministrator(userId: string): Promise<void> {
  await runIdempotentRequest(
    deleteScope,
    {},
    (body) =>
      servicesRequest<unknown, typeof body>(platformAdministratorPath(userId), {
        method: "DELETE",
        data: body,
      }),
    [userId],
  );
}

const platformAdministratorErrorMessages: Record<string, string> = {
  LAST_PLATFORM_ADMIN: "至少需要保留一名活跃的平台超级管理员",
  ROLE_CHANGE_INVALID: "当前账号状态不允许修改角色",
  PASSWORD_SAME_AS_OLD: "新密码不能与原密码相同",
  EMAIL_ALREADY_EXISTS: "该邮箱已被使用",
  USERNAME_ALREADY_EXISTS: "该用户名已被使用",
  ROLE_NOT_FOUND: "指定的平台角色不存在",
  PLATFORM_USER_NOT_FOUND: "平台运营账号不存在或已删除",
  FORBIDDEN: "当前账号没有执行此操作的权限",
};

export function getPlatformAdministratorErrorMessage(error: unknown) {
  const code = error instanceof ApiError ? (error.reason ?? error.code) : undefined;
  return (
    (code && platformAdministratorErrorMessages[code]) ||
    (error instanceof Error && error.message.trim()) ||
    "平台运营账号操作失败，请稍后重试"
  );
}

export type {
  CreatePlatformAdministratorInput,
  PlatformAdministratorAuditLog,
  PlatformAdministratorDetail,
  PlatformAdministratorListFilters,
  PlatformAdministratorListItem,
  PlatformAdministratorMutationResult,
  PlatformAdministratorRole,
  PlatformAdministratorRoleDefinition,
  PlatformAdministratorSource,
  PlatformAdministratorStatus,
  PlatformPermissionAccess,
  ResetPlatformAdministratorPasswordInput,
  UpdatePlatformAdministratorRoleInput,
} from "./types";
