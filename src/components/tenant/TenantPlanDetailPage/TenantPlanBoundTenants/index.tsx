import { Button } from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  bindTenantPlan,
  fetchTenantPlanBindableTenants,
  fetchTenantPlanBoundTenants,
  getTenantManagementErrorMessage,
  tenantManagementQueryKeys,
  type TenantPlanStatus,
} from "@/api/tenant";
import { DataTable, StatusBadge } from "@/components/common";
import { withId } from "@/lib/id";
import { tenantStatusMeta } from "../../apiModel";
import { TenantPlanBindModal } from "@/components/tenant/TenantPlanBindModal";

interface TenantPlanBoundTenantsProps {
  planId: string;
  planStatus: TenantPlanStatus;
  canManage: boolean;
}

async function runTenantPlanBindingOperation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw new Error(getTenantManagementErrorMessage(error));
  }
}

export function TenantPlanBoundTenants({
  planId,
  planStatus,
  canManage,
}: TenantPlanBoundTenantsProps) {
  const queryClient = useQueryClient();
  const [bindVisible, setBindVisible] = useState(false);
  const boundQuery = useQuery({
    meta: {
      errorNotification: {
        id: withId("tenant-plan-bound", planId),
        action: "关联租户加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: tenantManagementQueryKeys.planBoundTenants(planId),
    queryFn: () => fetchTenantPlanBoundTenants(planId),
  });
  const bindableQuery = useQuery({
    meta: {
      errorNotification: {
        id: withId("tenant-plan-bindable", planId),
        action: "可绑定租户加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: tenantManagementQueryKeys.planBindableTenants(planId),
    queryFn: () => fetchTenantPlanBindableTenants(planId),
  });
  const bindMutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "配额策略绑定",
        successText: "租户配额策略已更新",
        errorFallback: "配额策略绑定失败，请稍后重试",
      },
    },
    mutationFn: (tenantId: string) =>
      runTenantPlanBindingOperation(() => bindTenantPlan(tenantId, planId)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tenantManagementQueryKeys.all });
      setBindVisible(false);
    },
  });

  return (
    <>
      <div className="space-y-4 py-4">
        <div className="flex justify-end">
          <Button
            type="primary"
            disabled={
              !canManage ||
              planStatus !== "active" ||
              !bindableQuery.data?.length ||
              bindMutation.isPending
            }
            onClick={() => setBindVisible(true)}
          >
            绑定租户
          </Button>
        </div>
        <DataTable
          rowKey="id"
          columns={[
            {
              title: "租户",
              width: 260,
              render: (_, tenant) => (
                <Link to="/tenants/$tenantId" params={{ tenantId: tenant.id }}>
                  {tenant.displayName}
                </Link>
              ),
            },
            { title: "租户标识", dataIndex: "name", width: 220 },
            {
              title: "状态",
              width: 120,
              render: (_, tenant) => {
                const meta = tenantStatusMeta[tenant.status];
                return <StatusBadge tone={meta.tone} value={meta.label} />;
              },
            },
          ]}
          data={boundQuery.data || []}
          loading={boundQuery.isPending}
          pagination={false}
          scroll={{ x: 700 }}
          noDataElement={<div className="py-8 text-center text-gray-500">暂无关联租户</div>}
        />
      </div>

      {bindVisible ? (
        <TenantPlanBindModal
          tenants={bindableQuery.data || []}
          loading={bindMutation.isPending}
          onCancel={() => setBindVisible(false)}
          onSubmit={(tenantId) => bindMutation.mutate(tenantId)}
        />
      ) : null}
    </>
  );
}
