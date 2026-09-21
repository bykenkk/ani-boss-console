import { Button, Tag } from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  fetchTenantScopedAdministrators,
  getTenantManagementErrorMessage,
  inviteTenantAdministrator,
  tenantManagementQueryKeys,
} from "@/api/tenant";
import { DataTable } from "@/components/common";
import { formatDateTime } from "@/lib/date";
import { withId } from "@/lib/id";
import { tenantAdministratorRoleLabels, tenantAdministratorStatusMeta } from "../../apiModel";
import { TenantAdministratorInviteModal } from "../../TenantManagementModals";

interface TenantScopedAdministratorsProps {
  tenantId: string;
  tenantName: string;
  tenantDisplayName: string;
  canManage: boolean;
}

async function runTenantAdministratorOperation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw new Error(getTenantManagementErrorMessage(error));
  }
}

export function TenantScopedAdministrators({
  tenantId,
  tenantName,
  tenantDisplayName,
  canManage,
}: TenantScopedAdministratorsProps) {
  const queryClient = useQueryClient();
  const [inviteVisible, setInviteVisible] = useState(false);
  const administratorsQuery = useQuery({
    meta: {
      errorNotification: {
        id: withId("tenant-administrators", tenantId),
        action: "租户管理员加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: tenantManagementQueryKeys.tenantScopedAdministrators(tenantId),
    queryFn: () => fetchTenantScopedAdministrators(tenantId),
  });
  const inviteMutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "租户管理员邀请",
        successText: "管理员邀请已发送",
        errorFallback: "管理员邀请失败，请稍后重试",
      },
    },
    mutationFn: (input: Parameters<typeof inviteTenantAdministrator>[0]) =>
      runTenantAdministratorOperation(() => inviteTenantAdministrator(input)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tenantManagementQueryKeys.all });
      setInviteVisible(false);
    },
  });

  return (
    <>
      <div className="space-y-4 py-4">
        <div className="flex justify-end">
          <Button
            type="primary"
            disabled={!canManage || inviteMutation.isPending}
            onClick={() => setInviteVisible(true)}
          >
            邀请管理员
          </Button>
        </div>
        <DataTable
          rowKey="id"
          columns={[
            {
              title: "管理员",
              width: 220,
              render: (_, item) => (
                <Link to="/tenants-admins/$adminId" params={{ adminId: item.id }}>
                  {item.displayName || item.username}
                </Link>
              ),
            },
            { title: "邮箱", dataIndex: "email", width: 220 },
            {
              title: "角色",
              width: 120,
              render: (_, item) => tenantAdministratorRoleLabels[item.role],
            },
            {
              title: "状态",
              width: 100,
              render: (_, item) => {
                const meta = tenantAdministratorStatusMeta[item.status];
                return <Tag color={meta.color}>{meta.label}</Tag>;
              },
            },
            {
              title: "最近登录",
              dataIndex: "lastLoginAt",
              width: 180,
              render: (value: string | null) => formatDateTime(value),
            },
          ]}
          data={administratorsQuery.data || []}
          loading={administratorsQuery.isPending}
          pagination={false}
          scroll={{ x: 900 }}
          noDataElement={<div className="py-8 text-center text-gray-500">暂无管理员</div>}
        />
      </div>

      {inviteVisible ? (
        <TenantAdministratorInviteModal
          tenantId={tenantId}
          tenantOptions={[{ id: tenantId, name: tenantName, displayName: tenantDisplayName }]}
          loading={inviteMutation.isPending}
          onCancel={() => setInviteVisible(false)}
          onSubmit={(input) => inviteMutation.mutate(input)}
        />
      ) : null}
    </>
  );
}
