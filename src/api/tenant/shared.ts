import { servicesRequest } from "@/api/request";
import type { CursorPageParams } from "@/api/types";

export interface CursorListResponse<T> {
  items: T[];
  total?: number;
  next_cursor?: string | null;
}

// TODO(pagination-migration): 当前保留 ANI cursor/limit 契约；后端提供正式页码契约后迁移，单次仅查询当前页。
// TODO(api-verification): 部署并允许联调后，验证首屏、下一页、空页、筛选切换和请求取消。
export function fetchCursorPage<T>(
  path: string,
  params: CursorPageParams & object = {},
  signal?: AbortSignal,
): Promise<CursorListResponse<T>> {
  return servicesRequest(path, { method: "GET", params: { limit: 20, ...params }, signal });
}

// FIXME(pagination-migration): 当前自动遍历 cursor/limit 分页并汇总全量数据，请求数和内存占用随数据量增长。
// 仅剩管理员详情归属定位依赖本方法；后端提供按管理员 ID 查询归属或精确筛选的契约后，迁移该调用并移除此方法。
export async function fetchAllCursorPages<T>(path: string, params: object = {}): Promise<T[]> {
  const items: T[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | undefined;

  do {
    const response = await servicesRequest<CursorListResponse<T>>(path, {
      method: "GET",
      params: { ...params, limit: 100, cursor },
    });
    items.push(...response.items);
    const nextCursor = response.next_cursor || undefined;
    if (!nextCursor || seenCursors.has(nextCursor)) break;
    seenCursors.add(nextCursor);
    cursor = nextCursor;
  } while (cursor);

  return items;
}

export function tenantPath(tenantId: string, suffix = "") {
  return `/tenants/${encodeURIComponent(tenantId)}${suffix}`;
}

export function tenantAdministratorPath(tenantId: string, userId: string, suffix = "") {
  return tenantPath(tenantId, `/admins/${encodeURIComponent(userId)}${suffix}`);
}

export function tenantPlanPath(planId: string, suffix = "") {
  return `/tenant-plans/${encodeURIComponent(planId)}${suffix}`;
}
