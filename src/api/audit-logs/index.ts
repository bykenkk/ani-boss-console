import { adminRequest } from "@/api/request";
import type { AuditLogByKind, AuditLogKind, AuditLogList, AuditLogListParams } from "./types";

export * from "./types";

const auditLogPaths: Record<AuditLogKind, string> = {
  login: "/login-audit-logs",
  api: "/api-audit-logs",
  operation: "/operation-audit-logs",
};

export const auditLogKeys = {
  list: (kind: AuditLogKind, params: AuditLogListParams) =>
    ["audit-logs", kind, "list", params] as const,
  detail: (kind: AuditLogKind, id: number) => ["audit-logs", kind, "detail", id] as const,
};

// TODO(pagination-migration): 三类日志保留旧 PagingRequest；默认条数和非法参数校验尚未对齐正式分页约定。
// 当前显式发送 page/pageSize（最多 100）；后端完成严格分页校验后重新核对并移除此标记。
// TODO(audit-integration): 静态核对已完成；由项目负责人验证组合筛选、空数据、详情、401 刷新和取消请求。
export function listAuditLogs<K extends AuditLogKind>(
  kind: K,
  params: AuditLogListParams,
  signal?: AbortSignal,
): Promise<AuditLogList<AuditLogByKind[K]>> {
  return adminRequest(auditLogPaths[kind], {
    signal,
    params: {
      page: params.page ?? 1,
      pageSize: Math.min(100, Math.max(1, params.pageSize ?? 20)),
      query: JSON.stringify(params.filters ?? {}),
      orderBy: "created_at desc",
    },
  });
}

export function getAuditLog<K extends AuditLogKind>(
  kind: K,
  id: number,
  signal?: AbortSignal,
): Promise<AuditLogByKind[K]> {
  return adminRequest(`${auditLogPaths[kind]}/${id}`, { signal });
}
