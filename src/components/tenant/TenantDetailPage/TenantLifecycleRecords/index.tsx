import { useQuery } from "@tanstack/react-query";
import { fetchTenantLifecycle, tenantManagementQueryKeys } from "@/api/tenant";
import { DataTable } from "@/components/common";
import { formatDateTime } from "@/lib/date";
import { withId } from "@/lib/id";
import { tenantLifecycleActionLabels } from "../../apiModel";

interface TenantLifecycleRecordsProps {
  tenantId: string;
}

export function TenantLifecycleRecords({ tenantId }: TenantLifecycleRecordsProps) {
  const lifecycleQuery = useQuery({
    meta: {
      errorNotification: {
        id: withId("tenant-lifecycle", tenantId),
        action: "租户生命周期加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: tenantManagementQueryKeys.tenantLifecycle(tenantId),
    queryFn: () => fetchTenantLifecycle(tenantId),
  });

  return (
    <div className="py-4">
      <DataTable
        rowKey="id"
        columns={[
          {
            title: "动作",
            width: 120,
            render: (_, item) => tenantLifecycleActionLabels[item.action],
          },
          { title: "原因", dataIndex: "reason", width: 260 },
          { title: "操作人", dataIndex: "userId", width: 180 },
          { title: "请求 ID", dataIndex: "requestId", width: 180 },
          {
            title: "时间",
            dataIndex: "createdAt",
            width: 180,
            render: (value: string) => formatDateTime(value),
          },
        ]}
        data={lifecycleQuery.data || []}
        loading={lifecycleQuery.isPending}
        pagination={false}
        scroll={{ x: 1000 }}
        noDataElement={<div className="py-8 text-center text-gray-500">暂无生命周期记录</div>}
      />
    </div>
  );
}
