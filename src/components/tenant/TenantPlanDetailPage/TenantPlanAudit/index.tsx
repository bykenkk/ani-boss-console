import { useCursorPagination } from "@/hooks/useCursorPagination";
import { useQuery } from "@tanstack/react-query";
import { fetchTenantPlanAuditLogs, tenantManagementQueryKeys } from "@/api/tenant";
import { DataTable, StatusBadge } from "@/components/common";
import { formatDateTime } from "@/lib/date";
import { withId } from "@/lib/id";

interface TenantPlanAuditProps {
  planId: string;
}

export function TenantPlanAudit({ planId }: TenantPlanAuditProps) {
  const cursor = useCursorPagination(planId);
  const pageParams = { cursor: cursor.cursor, limit: cursor.limit };
  const auditQuery = useQuery({
    meta: {
      errorNotification: {
        id: withId("tenant-plan-audit", planId),
        action: "策略审计记录加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: [...tenantManagementQueryKeys.planAudit(planId), pageParams],
    queryFn: ({ signal }) => fetchTenantPlanAuditLogs(planId, pageParams, signal),
  });

  return (
    <div className="py-4">
      <DataTable
        rowKey="id"
        columns={[
          { title: "动作", dataIndex: "action", width: 220 },
          {
            title: "结果",
            width: 120,
            render: (_, item) => (
              <StatusBadge
                tone={item.result === "success" ? "success" : "danger"}
                value={item.result === "success" ? "成功" : "失败"}
              />
            ),
          },
          {
            title: "详情",
            width: 320,
            render: (_, item) => (item.details ? JSON.stringify(item.details) : "-"),
          },
          {
            title: "时间",
            dataIndex: "createdAt",
            width: 180,
            render: (value: string) => formatDateTime(value),
          },
        ]}
        data={auditQuery.data?.items ?? []}
        loading={auditQuery.isPending}
        pagination={cursor.getPagination(
          auditQuery.data?.next_cursor ?? undefined,
          auditQuery.isFetching,
        )}
        scroll={{ x: 900 }}
        noDataElement={<div className="py-8 text-center text-gray-500">暂无审计记录</div>}
      />
    </div>
  );
}
