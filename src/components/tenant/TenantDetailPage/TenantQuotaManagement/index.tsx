import { fetchTenantQuota, tenantManagementQueryKeys, type TenantQuotaItem } from "@/api/tenant";
import { DataTable, type ListColumn } from "@/components/common";
import { withId } from "@/lib/id";
import { Progress } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { TenantQuotaRequestModal } from "@/components/tenant/TenantQuotaRequestModal";

interface TenantQuotaManagementProps {
  tenantId: string;
}

const quotaColumns: ListColumn<TenantQuotaItem>[] = [
  {
    title: "资源维度",
    dataIndex: "displayName",
    width: 150,
    ellipsis: true,
    fixed: "left",
  },
  {
    title: "资源标识",
    dataIndex: "resourceType",
    width: 150,
    ellipsis: true,
  },
  {
    title: "已用",
    dataIndex: "used",
    width: 80,
    ellipsis: true,
  },
  {
    title: "上限",
    dataIndex: "total",
    width: 80,
    ellipsis: true,
  },
  {
    title: "单位",
    dataIndex: "unit",
    width: 50,
    ellipsis: true,
  },
  {
    title: "使用率",
    width: 180,
    render: (_, item) => {
      const percent =
        item.total > 0 ? Math.min(100, Math.round((item.used / item.total) * 100)) : 0;
      return <Progress percent={percent} size="small" />;
    },
  },
];

export function TenantQuotaManagement({ tenantId }: TenantQuotaManagementProps) {
  const [quotaTarget, setQuotaTarget] = useState<TenantQuotaItem | null>(null);
  const quotaQuery = useQuery({
    meta: {
      errorNotification: {
        id: withId("tenant-quota", tenantId),
        action: "租户配额加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: tenantManagementQueryKeys.tenantQuota(tenantId),
    queryFn: () => fetchTenantQuota(tenantId),
  });

  return (
    <>
      <section>
        <DataTable
          header={{ title: "当前配额" }}
          rowKey="resourceType"
          columns={quotaColumns}
          data={quotaQuery.data || []}
          loading={quotaQuery.isPending}
          pagination={false}
          rowActions={[
            {
              key: "adjust",
              label: "配额调整",
              onClick: setQuotaTarget,
            },
          ]}
          scroll={{ x: 1000 }}
          noDataElement={<div className="py-8 text-center text-gray-500">暂无配额</div>}
        />
      </section>
      {quotaTarget ? (
        <TenantQuotaRequestModal
          item={quotaTarget}
          tenantId={tenantId}
          onCancel={() => setQuotaTarget(null)}
          onSuccess={() => setQuotaTarget(null)}
        />
      ) : null}
    </>
  );
}
