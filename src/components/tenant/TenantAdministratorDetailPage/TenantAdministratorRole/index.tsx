import { Button, Tag } from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  fetchTenantRoles,
  getTenantManagementErrorMessage,
  tenantManagementQueryKeys,
  updateTenantAdministratorRole,
  type TenantAdministratorRole as TenantAdministratorRoleName,
} from "@/api/tenant";
import { DataTable } from "@/components/common";
import { withId } from "@/lib/id";
import { tenantAdministratorRoleLabels } from "../../apiModel";
import { TenantAdministratorRoleModal } from "@/components/tenant/TenantAdministratorRoleModal";

interface TenantAdministratorRoleProps {
  tenantId: string;
  administratorId: string;
  currentRole: TenantAdministratorRoleName;
  isInviting: boolean;
  canManage: boolean;
}

export function TenantAdministratorRole({
  tenantId,
  administratorId,
  currentRole,
  isInviting,
  canManage,
}: TenantAdministratorRoleProps) {
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const rolesQuery = useQuery({
    meta: {
      errorNotification: {
        id: withId("tenant-administrator-roles", administratorId),
        action: "租户角色加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: tenantManagementQueryKeys.administratorRoles(tenantId),
    queryFn: () => fetchTenantRoles(tenantId),
  });
  const roleMutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "管理员角色更新",
        successText: "管理员角色已更新",
        errorFallback: "管理员角色更新失败，请稍后重试",
      },
    },
    mutationFn: async (roleId: string) => {
      try {
        return await updateTenantAdministratorRole({
          tenantId,
          userId: administratorId,
          roleId,
        });
      } catch (error) {
        throw new Error(getTenantManagementErrorMessage(error));
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tenantManagementQueryKeys.all });
      setModalVisible(false);
    },
  });

  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center justify-between">
        <div>
          当前角色：
          <Tag>{tenantAdministratorRoleLabels[currentRole]}</Tag>
        </div>
        <Button
          disabled={!canManage || isInviting || roleMutation.isPending}
          onClick={() => setModalVisible(true)}
        >
          修改角色
        </Button>
      </div>
      <DataTable
        rowKey="id"
        columns={[
          {
            title: "角色",
            width: 150,
            ellipsis: true,
            fixed: "left",
            render: (_, role) => tenantAdministratorRoleLabels[role.name],
          },
          {
            title: "权限数量",
            width: 80,
            ellipsis: true,
            render: (_, role) => role.permissions.length,
          },
          {
            title: "权限定义",
            width: 480,
            render: (_, role) => (role.permissions.length ? JSON.stringify(role.permissions) : "-"),
          },
        ]}
        data={rolesQuery.data || []}
        loading={rolesQuery.isPending}
        pagination={false}
        scroll={{ x: 850 }}
        noDataElement={<div className="py-8 text-center text-gray-500">暂无角色定义</div>}
      />

      {modalVisible ? (
        <TenantAdministratorRoleModal
          roles={rolesQuery.data || []}
          currentRole={currentRole}
          loading={roleMutation.isPending}
          onCancel={() => setModalVisible(false)}
          onSubmit={(roleId) => roleMutation.mutate(roleId)}
        />
      ) : null}
    </div>
  );
}
