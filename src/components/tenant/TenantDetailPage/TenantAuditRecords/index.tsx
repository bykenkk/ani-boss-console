import { fetchTenantAuditLogs, tenantManagementQueryKeys } from "@/api/tenant";
import { DataTable, StatusBadge } from "@/components/common";
import { formatDateTime } from "@/lib/date";
import { withId } from "@/lib/id";

import { useQuery } from "@tanstack/react-query";
import { tenantAuditActionLabels } from "../../apiModel";

interface TenantAuditRecordsProps {
  tenantId: string;
}

export function TenantAuditRecords({ tenantId }: TenantAuditRecordsProps) {
  const auditQuery = useQuery({
    meta: {
      errorNotification: {
        id: withId("tenant-audit", tenantId),
        action: "租户审计记录加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: tenantManagementQueryKeys.tenantAudit(tenantId),
    queryFn: () => fetchTenantAuditLogs(tenantId),
  });

  return (
    <DataTable
      rowKey="id"
      columns={[
        {
          title: "动作",
          dataIndex: "action",
          width: 150,
          fixed: "left",
          ellipsis: true,
          render: (value: string) => tenantAuditActionLabels[value] ?? value,
        },
        {
          title: "资源",
          dataIndex: "resource",
          width: 100,
          ellipsis: true,
        },
        {
          title: "结果",
          width: 80,
          render: (_, item) => (
            <StatusBadge
              tone={item.result === "success" ? "success" : "danger"}
              value={item.result === "success" ? "成功" : "失败"}
            />
          ),
        },
        {
          title: "操作人",
          dataIndex: "userId",
          width: 180,
          ellipsis: true,
        },
        {
          title: "时间",
          dataIndex: "createdAt",
          width: 150,
          render: (value: string) => formatDateTime(value),
        },
      ]}
      data={auditQuery.data || []}
      loading={auditQuery.isPending}
      pagination={false}
      scroll={{ x: 900 }}
      noDataElement={<div className="py-8 text-center text-gray-500">暂无审计记录</div>}
    />
  );
}
