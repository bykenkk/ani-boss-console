import { useCursorPagination } from "@/hooks/useCursorPagination";
import { Button } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { fetchTenantScopedAdministrators, tenantManagementQueryKeys } from "@/api/tenant";
import { DataTable } from "@/components/common";
import { formatDateTime } from "@/lib/date";
import { withId } from "@/lib/id";
import { tenantAdministratorRoleLabels } from "@/components/tenant/TenantAdministratorRoleModal/TenantAdministratorRoleFields/labels";
import { TenantAdministratorStatusBadge } from "@/components/tenant/TenantAdministratorStatusBadge";
import { TenantAdministratorInviteModal } from "@/components/tenant/TenantAdministratorInviteModal";

interface TenantScopedAdministratorsProps {
  tenantId: string;
  tenantName: string;
  tenantDisplayName: string;
  canManage: boolean;
}

export function TenantScopedAdministrators({
  tenantId,
  tenantName,
  tenantDisplayName,
  canManage,
}: TenantScopedAdministratorsProps) {
  const [inviteVisible, setInviteVisible] = useState(false);
  const cursor = useCursorPagination(tenantId);
  const pageParams = { cursor: cursor.cursor, limit: cursor.limit };
  const administratorsQuery = useQuery({
    meta: {
      errorNotification: {
        id: withId("tenant-administrators", tenantId),
        action: "租户管理员加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: [...tenantManagementQueryKeys.tenantScopedAdministrators(tenantId), pageParams],
    queryFn: ({ signal }) => fetchTenantScopedAdministrators(tenantId, pageParams, signal),
  });

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button type="primary" disabled={!canManage} onClick={() => setInviteVisible(true)}>
            邀请管理员
          </Button>
        </div>
        <DataTable
          rowKey="id"
          columns={[
            {
              title: "管理员",
              width: 200,
              ellipsis: true,
              fixed: "left",
              render: (_, item) => item.displayName || item.username,
            },
            {
              title: "邮箱",
              dataIndex: "email",
              width: 200,
              ellipsis: true,
            },
            {
              title: "角色",
              width: 120,
              ellipsis: true,
              render: (_, item) => tenantAdministratorRoleLabels[item.role],
            },
            {
              title: "状态",
              width: 120,
              render: (_, item) => <TenantAdministratorStatusBadge status={item.status} />,
            },
            {
              title: "最近登录",
              dataIndex: "lastLoginAt",
              width: 180,
              ellipsis: true,
              render: (value: string | null) => formatDateTime(value),
            },
          ]}
          data={administratorsQuery.data?.items ?? []}
          loading={administratorsQuery.isPending}
          pagination={cursor.getPagination(
            administratorsQuery.data?.next_cursor ?? undefined,
            administratorsQuery.isFetching,
          )}
          scroll={{ x: 900 }}
          noDataElement={<div className="py-8 text-center text-gray-500">暂无管理员</div>}
        />
      </div>

      {inviteVisible ? (
        <TenantAdministratorInviteModal
          tenantId={tenantId}
          tenantName={tenantDisplayName || tenantName}
          onCancel={() => setInviteVisible(false)}
          onSuccess={() => setInviteVisible(false)}
        />
      ) : null}
    </>
  );
}
