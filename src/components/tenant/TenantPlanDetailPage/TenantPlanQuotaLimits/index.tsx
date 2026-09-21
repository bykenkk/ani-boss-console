import { Button } from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  fetchTenantPlanQuotaLimits,
  getTenantManagementErrorMessage,
  tenantManagementQueryKeys,
  updateTenantPlanQuotaLimits,
  type TenantPlanStatus,
} from "@/api/tenant";
import { DataTable } from "@/components/common";
import { withId } from "@/lib/id";
import { TenantPlanLimitsModal } from "../../TenantManagementModals";

interface TenantPlanQuotaLimitsProps {
  planId: string;
  planStatus: TenantPlanStatus;
  canManage: boolean;
}

async function runTenantPlanLimitOperation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw new Error(getTenantManagementErrorMessage(error));
  }
}

export function TenantPlanQuotaLimits({
  planId,
  planStatus,
  canManage,
}: TenantPlanQuotaLimitsProps) {
  const queryClient = useQueryClient();
  const [limitsVisible, setLimitsVisible] = useState(false);
  const limitsQuery = useQuery({
    meta: {
      errorNotification: {
        id: withId("tenant-plan-limits", planId),
        action: "套餐限额加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: tenantManagementQueryKeys.planLimits(planId),
    queryFn: () => fetchTenantPlanQuotaLimits(planId),
  });
  const limitsMutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "套餐限额更新",
        successText: "套餐限额已更新",
        errorFallback: "套餐限额更新失败，请稍后重试",
      },
    },
    mutationFn: (items: Array<{ resourceType: string; total: number }>) =>
      runTenantPlanLimitOperation(() => updateTenantPlanQuotaLimits({ planId, items })),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tenantManagementQueryKeys.all });
      setLimitsVisible(false);
    },
  });

  return (
    <>
      <div className="space-y-4 py-4">
        <div className="flex justify-end">
          <Button
            disabled={!canManage || planStatus !== "draft" || limitsMutation.isPending}
            onClick={() => setLimitsVisible(true)}
          >
            编辑限额
          </Button>
        </div>
        <DataTable
          rowKey="resourceType"
          columns={[
            { title: "资源维度", dataIndex: "displayName", width: 220 },
            { title: "资源标识", dataIndex: "resourceType", width: 220 },
            { title: "上限", dataIndex: "total", width: 140, align: "right" },
            { title: "单位", dataIndex: "unit", width: 120 },
          ]}
          data={limitsQuery.data || []}
          loading={limitsQuery.isPending}
          pagination={false}
          scroll={{ x: 800 }}
          noDataElement={<div className="py-8 text-center text-gray-500">暂无限额配置</div>}
        />
      </div>

      {limitsVisible ? (
        <TenantPlanLimitsModal
          limits={limitsQuery.data || []}
          loading={limitsMutation.isPending}
          onCancel={() => setLimitsVisible(false)}
          onSubmit={(items) => limitsMutation.mutate(items)}
        />
      ) : null}
    </>
  );
}
