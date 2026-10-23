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
  if (input.id !== undefined && resource === "users") {
    const current = await getManagement(resource, input.id);
    // UserService 校验 tenantId 和完整角色集。
    data = {
      tenantId: current.tenantId ?? 0,
      roleIds: current.roleIds ?? (current.roleId ? [current.roleId] : []),
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
          // TODO(permission-update-verification): 后端修复部署并允许联调后，验证权限普通字段更新保留关联、关联替换及显式空数组清空。
          updateMask: Object.keys(values).join(","),
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
  await adminRequest(`/${resource}/${id}`, {
    method: "DELETE",
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
