import { useQuery } from "@tanstack/react-query";
import { fetchTenantAdministratorAuditLogs, tenantManagementQueryKeys } from "@/api/tenant";
import { DataTable, StatusBadge } from "@/components/common";
import { formatDateTime } from "@/lib/date";
import { withId } from "@/lib/id";

interface TenantAdministratorAuditProps {
  tenantId: string;
  administratorId: string;
}

export function TenantAdministratorAudit({
  tenantId,
  administratorId,
}: TenantAdministratorAuditProps) {
  const auditQuery = useQuery({
    meta: {
      errorNotification: {
        id: withId("tenant-administrator-audit", administratorId),
        action: "管理员审计记录加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: tenantManagementQueryKeys.administratorAudit(tenantId, administratorId),
    queryFn: () => fetchTenantAdministratorAuditLogs(tenantId, administratorId),
  });

  return (
    <div className="py-4">
      <DataTable
        rowKey="id"
        columns={[
          { title: "动作", dataIndex: "action", width: 200 },
          { title: "资源", dataIndex: "resource", width: 220 },
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
          { title: "操作人", dataIndex: "userId", width: 180 },
          {
            title: "时间",
            dataIndex: "createdAt",
            width: 180,
            render: (value: string) => formatDateTime(value),
          },
        ]}
        data={auditQuery.data || []}
        loading={auditQuery.isPending}
        pagination={false}
        scroll={{ x: 950 }}
        noDataElement={<div className="py-8 text-center text-gray-500">暂无操作记录</div>}
      />
    </div>
  );
}
