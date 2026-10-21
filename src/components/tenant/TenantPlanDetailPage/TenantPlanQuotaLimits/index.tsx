import {
  fetchTenantPlanQuotaLimits,
  tenantManagementQueryKeys,
  type TenantPlanStatus,
} from "@/api/tenant";
import { DataTable } from "@/components/common";
import { withId } from "@/lib/id";
import { Button } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { TenantPlanLimitsModal } from "@/components/tenant/TenantPlanLimitsModal";

interface TenantPlanQuotaLimitsProps {
  planId: string;
  planStatus: TenantPlanStatus;
  canManage: boolean;
}

export function TenantPlanQuotaLimits({
  planId,
  planStatus,
  canManage,
}: TenantPlanQuotaLimitsProps) {
  const [limitsVisible, setLimitsVisible] = useState(false);
  const limitsQuery = useQuery({
    meta: {
      errorNotification: {
        id: withId("tenant-plan-limits", planId),
        action: "配额上限加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: tenantManagementQueryKeys.planLimits(planId),
    queryFn: () => fetchTenantPlanQuotaLimits(planId),
  });

  return (
    <>
      <div className="space-y-4 py-4">
        <div className="flex justify-end">
          <Button
            disabled={!canManage || planStatus !== "draft"}
            onClick={() => setLimitsVisible(true)}
          >
            编辑限额
          </Button>
        </div>
        <DataTable
          rowKey="resourceType"
          columns={[
            {
              title: "资源维度",
              dataIndex: "displayName",
              width: 100,
              fixed: "left",
              ellipsis: true,
            },
            {
              title: "资源标识",
              dataIndex: "resourceType",
              width: 120,
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
              width: 80,
              ellipsis: true,
            },
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
          planId={planId}
          onCancel={() => setLimitsVisible(false)}
          onSuccess={() => setLimitsVisible(false)}
        />
      ) : null}
    </>
  );
}
