import { Button } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  fetchTenantPlanBoundTenants,
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

export function TenantPlanBoundTenants({
  planId,
  planStatus,
  canManage,
}: TenantPlanBoundTenantsProps) {
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

  return (
    <>
      <div className="space-y-4 py-4">
        <div className="flex justify-end">
          <Button
            type="primary"
            disabled={!canManage || planStatus !== "active"}
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
              width: 200,
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
          planId={planId}
          onCancel={() => setBindVisible(false)}
          onSuccess={() => setBindVisible(false)}
        />
      ) : null}
    </>
  );
}
