import { Button, Tag } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  fetchTenantRoles,
  tenantManagementQueryKeys,
  type TenantAdministratorRole as TenantAdministratorRoleName,
} from "@/api/tenant";
import { DataTable } from "@/components/common";
import { withId } from "@/lib/id";
import { tenantAdministratorRoleLabels } from "@/components/tenant/TenantAdministratorRoleModal/TenantAdministratorRoleFields/labels";
import { TenantAdministratorRoleModal } from "@/components/tenant/TenantAdministratorRoleModal";

interface TenantAdministratorRoleProps {
  tenantId: string;
  administratorId: string;
  currentRole: TenantAdministratorRoleName;
  isInviting: boolean;
}

export function TenantAdministratorRole({
  tenantId,
  administratorId,
  currentRole,
  isInviting,
}: TenantAdministratorRoleProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const rolesQuery = useQuery({
    meta: {
      errorNotification: {
        id: withId("tenant-administrator-roles", tenantId),
        action: "租户角色加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: tenantManagementQueryKeys.administratorRoles(tenantId),
    queryFn: () => fetchTenantRoles(tenantId),
  });

  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center justify-between">
        <div>
          当前角色：
          <Tag>{tenantAdministratorRoleLabels[currentRole]}</Tag>
        </div>
        <Button disabled={isInviting} onClick={() => setModalVisible(true)}>
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
          tenantId={tenantId}
          administratorId={administratorId}
          onCancel={() => setModalVisible(false)}
          onSuccess={() => setModalVisible(false)}
        />
      ) : null}
    </div>
  );
}
