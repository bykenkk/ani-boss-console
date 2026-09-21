import { servicesRequest } from "@/api/request";

export interface CursorListResponse<T> {
  items: T[];
  total?: number;
  next_cursor?: string | null;
}

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
