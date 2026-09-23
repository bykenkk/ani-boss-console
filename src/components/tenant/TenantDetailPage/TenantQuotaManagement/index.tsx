import {
  fetchTenantQuota,
  getTenantManagementErrorMessage,
  reviewTenantQuotaChangeRequest,
  submitTenantQuotaChangeRequest,
  tenantManagementQueryKeys,
  type TenantQuotaItem,
} from "@/api/tenant";
import { DataTable, type ListColumn } from "@/components/common";
import { withId } from "@/lib/id";
import { Progress } from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { TenantQuotaRequestModal } from "@/components/tenant/TenantQuotaRequestModal";

interface TenantQuotaManagementProps {
  tenantId: string;
  canManage: boolean;
}

async function runTenantQuotaOperation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw new Error(getTenantManagementErrorMessage(error));
  }
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

export function TenantQuotaManagement({ tenantId, canManage }: TenantQuotaManagementProps) {
  const queryClient = useQueryClient();
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
  const invalidateAll = () =>
    queryClient.invalidateQueries({ queryKey: tenantManagementQueryKeys.all });
  const quotaAdjustmentMutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "配额调整",
        successText: "配额已调整",
        errorFallback: "配额调整失败，请稍后重试",
      },
    },
    mutationFn: ({ resourceType, newValue }: { resourceType: string; newValue: number }) =>
      runTenantQuotaOperation(async () => {
        const request = await submitTenantQuotaChangeRequest({
          tenantId,
          items: [{ resourceType, newValue }],
        });
        return reviewTenantQuotaChangeRequest({
          tenantId,
          requestId: request.id,
          approved: true,
        });
      }),
    onSuccess: async () => {
      await invalidateAll();
      setQuotaTarget(null);
    },
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
              disabled: () => !canManage || quotaAdjustmentMutation.isPending,
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
          loading={quotaAdjustmentMutation.isPending}
          onCancel={() => setQuotaTarget(null)}
          onSubmit={(newValue) =>
            quotaAdjustmentMutation.mutate({
              resourceType: quotaTarget.resourceType,
              newValue,
            })
          }
        />
      ) : null}
    </>
  );
}
