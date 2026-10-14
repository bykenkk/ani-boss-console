import { adminRequest } from "@/api/request";
import { encryptManagementPassword } from "./password";
import type {
  EditValues,
  ManagementList,
  ManagementListInput,
  Resource,
  ResourceRecords,
  SaveManagementInput,
  TenantWithAdministratorInput,
} from "./types";
export * from "./types";
export const managementKeys = {
  all: ["management"] as const,
  list: (resource: Resource, input: ManagementListInput) =>
    ["management", resource, "list", input] as const,
  detail: (resource: Resource, id: number) => ["management", resource, "detail", id] as const,
};
export async function listManagement<R extends Resource>(
  resource: R,
  input: ManagementListInput = {},
  signal?: AbortSignal,
): Promise<ManagementList<ResourceRecords[R]>> {
  const result = await adminRequest<{ items?: ResourceRecords[R][]; total?: string | number }>(
    `/${resource}`,
    {
      method: "GET",
      signal,
      params: {
        page: input.page ?? 1,
        pageSize: input.pageSize ?? 20,
        noPaging: input.noPaging,
        query: JSON.stringify(input.filters ?? {}),
        orderBy: "id desc",
      },
    },
  );
  return { items: result.items ?? [], total: Number(result.total ?? 0) };
}
export function getManagement<R extends Resource>(
  resource: R,
  id: number,
  signal?: AbortSignal,
): Promise<ResourceRecords[R]> {
  return adminRequest(`/${resource}/${id}`, { method: "GET", signal });
}
export async function listManagementOptions<R extends Resource>(
  resource: R,
  filters: ManagementListInput["filters"] = {},
  signal?: AbortSignal,
): Promise<ResourceRecords[R][]> {
  // FIXME: noPaging 仍受后端 10000 条上限约束；需改为服务端分页加载，确保关联选项完整。
  const { items } = await listManagement(resource, { noPaging: true, filters }, signal);
  if (resource !== "permission-groups") return items;
  const flatten = (
    nodes: ResourceRecords["permission-groups"][],
  ): ResourceRecords["permission-groups"][] =>
    nodes.flatMap((node) => [node, ...flatten(node.children ?? [])]);
  return flatten(items as ResourceRecords["permission-groups"][]) as ResourceRecords[R][];
}
export async function saveManagement(
  resource: Resource,
  input: SaveManagementInput,
): Promise<void> {
  const { password, ...values } = input.values;
  let data: EditValues = values;
  if (input.id !== undefined && (resource === "permissions" || resource === "users")) {
    const current = await getManagement(resource, input.id);
    // PermissionRepo 无条件替换 menuIds/apiIds；UserService 校验 tenantId 和完整角色集。
    data =
      resource === "permissions"
        ? {
            ...current,
            menuIds: (current as ResourceRecords["permissions"]).menuIds ?? [],
            apiIds: (current as ResourceRecords["permissions"]).apiIds ?? [],
            ...values,
          }
        : {
            tenantId: (current as ResourceRecords["users"]).tenantId ?? 0,
            roleIds:
              (current as ResourceRecords["users"]).roleIds ??
              ((current as ResourceRecords["users"]).roleId
                ? [(current as ResourceRecords["users"]).roleId!]
                : []),
            ...values,
          };
  }
  // 当前这些管理写接口没有幂等 key 契约。
  const body =
    input.id === undefined
      ? { data, ...(resource === "users" ? { password, activationMode: "IMMEDIATE" } : {}) }
      : {
          id: input.id,
          data,
          // FIXME: 后端修复 PermissionRepo 的关联 updateMask 处理后，恢复仅提交已编辑字段。
          // 当前关联 mask 被剔除后 DTO 会被原地过滤，导致关联被清空。
          // 该接口允许省略 mask；以上最新详情合并用户修改后完整提交，保留菜单关联。
          ...(resource === "permissions" ? {} : { updateMask: Object.keys(values).join(",") }),
        };
  await adminRequest<void, typeof body>(
    `/${resource}${input.id === undefined ? "" : `/${input.id}`}`,
    {
      method: input.id === undefined ? "POST" : "PUT",
      data: body,
    },
  );
}
export function deleteManagement(resource: Resource, id: number): Promise<void> {
  const queryId = resource === "plans" || resource === "plan-quotas";
  return adminRequest(`/${resource}${queryId ? "" : `/${id}`}`, {
    method: "DELETE",
    params: queryId ? { id } : undefined,
  });
}
export function createTenantWithAdministrator(input: TenantWithAdministratorInput): Promise<void> {
  return adminRequest<void, TenantWithAdministratorInput & { activationMode: string }>(
    "/tenants:with-admin",
    {
      method: "POST",
      data: { ...input, activationMode: "IMMEDIATE" },
    },
  );
}
export async function resetManagementPassword(userId: number, password: string): Promise<void> {
  const newPassword = await encryptManagementPassword(password);
  await adminRequest<void, { userId: number; newPassword: string }>(`/users/${userId}/password`, {
    method: "POST",
    data: { userId, newPassword },
  });
}
export function syncManagementApis(): Promise<void> {
  return adminRequest("/apis/sync", { method: "POST" });
}
export interface TenantUsage {
  tenantId?: number;
  userCount?: string;
  storageUsedBytes?: string;
  apiCallCount?: string;
  planName?: string;
  quotas?: Array<{ quotaCode?: string; quotaType?: string; quotaValue?: string }>;
}
export function getManagedTenantUsage(id: number, signal?: AbortSignal): Promise<TenantUsage> {
  return adminRequest(`/tenants/${id}/usage`, { method: "GET", signal });
}
