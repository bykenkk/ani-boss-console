import { Empty, Spin, Tree, Typography } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { listManagement, managementKeys } from "@/api/management";
import { buildPermissionApiTree, getCheckedApiIds } from "./api-tree";

interface Props {
  value?: number[];
  onChange?: (value: number[]) => void;
}

export function ApiTreeSelect({ value = [], onChange }: Props) {
  const query = useQuery({
    queryKey: managementKeys.list("apis", { noPaging: true }),
    queryFn: ({ signal }) => listManagement("apis", { noPaging: true }, signal),
    meta: {
      errorNotification: { id: "permission-apis", action: "关联 API 加载" },
    },
  });
  // FIXME: 沿用管理选项的 noPaging 查询，仍受后端 10000 条上限约束。
  const items = query.data?.items ?? [];
  const treeData = buildPermissionApiTree(items);

  return (
    <div aria-label="关联 API">
      <Spin loading={query.isPending} className="w-full">
        <div className="max-h-80 overflow-auto rounded border border-[var(--color-border-2)] p-3">
          {treeData.length ? (
            <Tree
              checkable
              selectable={false}
              checkStrictly={false}
              checkedStrategy={Tree.SHOW_CHILD}
              checkedKeys={value.map((id) => `api:${id}`)}
              treeData={treeData}
              defaultExpandedKeys={treeData.map((node) => node.key)}
              renderTitle={({ title }) => (
                <Typography.Text title={typeof title === "string" ? title : undefined}>
                  {title}
                </Typography.Text>
              )}
              onCheck={(keys) => {
                const available = new Set(items.map((item) => item.id));
                // 未加载到的已有 API 保持原值，避免调整其他关联时被意外清空。
                const retained = value.filter((id) => !available.has(id));
                onChange?.([...retained, ...getCheckedApiIds(keys, items)]);
              }}
            />
          ) : (
            <Empty description={query.isPending ? "加载中" : "暂无 API"} />
          )}
        </div>
      </Spin>
    </div>
  );
}
