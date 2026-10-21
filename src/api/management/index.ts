import { adminRequest } from "@/api/request";
import { withFirst100 } from "@/api/pagination";
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
  options: (resource: Resource, filters: ManagementListInput["filters"] = {}) =>
    ["management", resource, "options", filters] as const,
  detail: (resource: Resource, id: number) => ["management", resource, "detail", id] as const,
};
export async function listManagement<R extends Resource>(
  resource: R,
  input: ManagementListInput = {},
  signal?: AbortSignal,
): Promise<ManagementList<ResourceRecords[R]>> {
  const result = await adminRequest<ManagementList<ResourceRecords[R]>>(`/${resource}`, {
    method: "GET",
    signal,
    params: {
      page: input.page ?? 1,
      pageSize: input.pageSize ?? 20,
      noPaging: input.noPaging,
      query: JSON.stringify(input.filters ?? {}),
      orderBy: "id desc",
    },
  });
  return result;
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
  // TODO(options-pagination): 普通选项仅取服务端首 100 项；后端选项查询能力完善后移除固定分页策略。
  // FIXME(group-tree-pagination): 权限分组接口先分页后组树，直接截断可能丢失父节点；保留原树查询，待后端提供独立选项契约后迁移。
  const { items } =
    resource === "permission-groups"
      ? await listManagement(resource, { noPaging: true, filters }, signal)
      : await withFirst100((params: ManagementListInput, requestSignal?: AbortSignal) =>
          listManagement(resource, params, requestSignal),
        )({ filters }, signal);
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
  // FIXME(permission-update-mask): 权限更新暂以详情预读、全量合并并省略 mask 避免关联被清空，仍存在并发覆盖窗口。
  // TODO(permission-update-mask): Governance 按原始 mask 快照关联、仅替换选中关联的修复部署并验证后，
  // 移除 permissions 的详情预读与全量合并，改为仅提交已编辑字段；users 的租户与角色补齐逻辑单独保留。
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
          // TODO(permission-update-mask): 上方权限兼容逻辑移除时，同步恢复 permissions 的 updateMask。
          // 联调验证只改普通字段保留关联、修改关联按提交值替换、显式空数组清空；通过后再移除兼容标记。
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
export async function deleteManagement(resource: Resource, id: number): Promise<void> {
  const queryId = resource === "plans" || resource === "plan-quotas";
  await adminRequest(`/${resource}${queryId ? "" : `/${id}`}`, {
    method: "DELETE",
    params: queryId ? { id } : undefined,
  });
}
export async function createTenantWithAdministrator(
  input: TenantWithAdministratorInput,
): Promise<void> {
  await adminRequest<void, TenantWithAdministratorInput & { activationMode: string }>(
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
export async function syncManagementApis(): Promise<void> {
  await adminRequest("/apis/sync", { method: "POST" });
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
