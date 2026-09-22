import { IconSafe } from "@arco-design/web-react/icon";
import { useQuery } from "@tanstack/react-query";
import {
  fetchPlatformAdministratorRoles,
  platformAdministratorQueryKeys,
  type PlatformAdministratorRole,
  type PlatformAdministratorRoleDefinition,
} from "@/api/platform-admins";
import { ListDataTable, ListPageFrame, type ListColumn } from "@/components/common";
import { platformAdministratorRoleLabels } from "../model";

const platformRoleDescriptions: Record<PlatformAdministratorRole, string> = {
  "platform-admin":
    "拥有 BOSS 全部管理权限，可开通租户、配置资源池、管理平台账号，并处理计量与审计相关操作。",
  "platform-ops":
    "负责日常租户开通、冻结与资源池运维；不可管理平台账号，计量仅可查看，不能导出审计。",
  "platform-readonly":
    "以只读方式查看租户、资源池与计量数据，不可修改配置或管理账号；可导出审计，便于核查与留档。",
};

const columns: ListColumn<PlatformAdministratorRoleDefinition>[] = [
  {
    key: "name",
    title: "名称",
    width: 280,
    render: (_, role) => (
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-blue-50 text-lg text-blue-600">
          <IconSafe />
        </span>
        <span className="font-medium text-gray-900">
          {platformAdministratorRoleLabels[role.name]}
        </span>
      </div>
    ),
  },
  {
    title: "描述",
    render: (_, role) => platformRoleDescriptions[role.name],
  },
  {
    title: "创建时间",
    width: 180,
    render: () => "-",
  },
];

export function PlatformRolesPage() {
  const rolesQuery = useQuery({
    meta: {
      errorNotification: {
        id: "platform-administrator-roles",
        action: "平台角色加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: platformAdministratorQueryKeys.roles,
    queryFn: fetchPlatformAdministratorRoles,
  });

  return (
    <ListPageFrame
      header={{ title: "平台角色", subtitle: "内置超管、运维、只读三类角色，分配给平台管理员使用" }}
    >
      <ListDataTable
        rowKey="id"
        columns={columns}
        data={rolesQuery.data || []}
        loading={rolesQuery.isPending}
        pagination={false}
        tableLabel="平台角色列表"
        emptyText="暂无平台角色"
        scroll={{ x: 960, y: true }}
      />
    </ListPageFrame>
  );
}
