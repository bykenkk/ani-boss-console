import { Empty, Spin, Tree, Typography } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { listManagement, listManagementOptions, managementKeys } from "@/api/management";
import {
  buildRolePermissionTree,
  getCheckedPermissionIds,
  getPermissionTreeExpandedKeys,
} from "./permission-tree";

interface Props {
  value?: number[];
  onChange?: (value: number[]) => void;
}

export function PermissionTreeSelect({ value = [], onChange }: Props) {
  const groups = useQuery({
    queryKey: managementKeys.list("permission-groups", { noPaging: true }),
    queryFn: ({ signal }) => listManagement("permission-groups", { noPaging: true }, signal),
    meta: {
      errorNotification: { id: "role-permission-groups", action: "权限分组加载" },
    },
  });
  const permissions = useQuery({
    queryKey: managementKeys.options("permissions"),
    queryFn: ({ signal }) => listManagementOptions("permissions", {}, signal),
    meta: {
      errorNotification: { id: "role-permissions", action: "权限点加载" },
    },
  });
  // FIXME(group-tree-pagination): 分组仍依赖 noPaging 的服务端组树结果；后端提供不丢父节点的选项契约后迁移。
  // TODO(options-pagination): 权限点暂取服务端首 100 项，未加载的已有权限继续保留；后端选项契约完善后移除固定分页。
  const items = permissions.data ?? [];
  const treeData =
    groups.data && permissions.data ? buildRolePermissionTree(groups.data.items, items) : [];
  const loading = groups.isPending || permissions.isPending;

  return (
    <div aria-label="权限点">
      <Spin loading={loading} className="w-full">
        <div className="max-h-80 overflow-auto rounded border border-(--color-border-2) p-3">
          {treeData.length ? (
            <Tree
              checkable
              selectable={false}
              checkStrictly={false}
              checkedStrategy={Tree.SHOW_CHILD}
              checkedKeys={value.map((id) => `permission:${id}`)}
              treeData={treeData}
              defaultExpandedKeys={getPermissionTreeExpandedKeys(treeData)}
              renderTitle={({ title }) => (
                <Typography.Text title={typeof title === "string" ? title : undefined}>
                  {title}
                </Typography.Text>
              )}
              onCheck={(keys) => {
                const available = new Set(items.map((item) => item.id));
                // 未加载到的已有权限保持原值，避免调整其他权限时被意外清空。
                const retained = value.filter((id) => !available.has(id));
                onChange?.([...retained, ...getCheckedPermissionIds(keys, items)]);
              }}
            />
          ) : (
            <Empty description={loading ? "加载中" : "暂无权限点"} />
          )}
        </div>
      </Spin>
    </div>
  );
}
