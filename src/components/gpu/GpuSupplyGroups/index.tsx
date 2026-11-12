import { policyLabel } from "../GpuSupplyInitialization/policy";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  acceleratorKeys,
  listGpuSupplyGroups,
  type GpuPool,
  type GpuSupplyGroup,
} from "@/api/accelerator";
import {
  ResourceIdentity,
  TableSectionFrame,
  ListDataTable,
  StatusBadge,
  type ListColumn,
} from "@/components/common";
import { useCursorPagination } from "@/hooks/useCursorPagination";
import { withId } from "@/lib/id";
import { formatGpuAllocationType } from "../capacity";
import { GpuGroupCapacityModal } from "../GpuGroupCapacityModal";
const columns: ListColumn<GpuSupplyGroup>[] = [
  {
    title: "供给组 / ID",
    dataIndex: "display_name",
    width: 200,
    ellipsis: true,
    render: (_, row) => (
      <ResourceIdentity name={row.display_name} id={row.group_id} idLabel="资源 ID" />
    ),
  },

  {
    title: "冻结策略",
    width: 240,
    render: (_, group) => (group.policy ? policyLabel(group.policy) : "历史组：沿用已存规格"),
  },
  { title: "供给引用", dataIndex: "provider_config_ref", width: 240, ellipsis: true },
  { title: "登记版本", dataIndex: "provider_config_version", width: 120 },
  { title: "插件实际槽数 K", dataIndex: "baseline.split_count", width: 140 },
  { title: "GPU 型号", dataIndex: "model_key", width: 180, ellipsis: true },
  {
    title: "分配类型",
    render: (_, group) =>
      group.baseline?.resource_types
        ?.map((item) => formatGpuAllocationType(item.allocation_type))
        .join("、") || "-",
    width: 160,
    ellipsis: true,
  },
  {
    title: "节点 / UID",
    render: (_, row) => (
      <div className="flex min-w-0 flex-col gap-2">
        {row.nodes?.length ? (
          row.nodes.map((node) => (
            <ResourceIdentity
              key={node.uid || node.name}
              name={node.name}
              id={node.uid}
              idLabel="节点 UID"
            />
          ))
        ) : (
          <ResourceIdentity display="name" />
        )}
      </div>
    ),
    width: 200,
    ellipsis: true,
  },

  {
    title: "基线 ID",
    dataIndex: "baseline.baseline_id",
    width: 220,
    ellipsis: true,
    render: (_, row) => (
      <ResourceIdentity id={row.baseline?.baseline_id} display="id" idLabel="基线 ID" />
    ),
  },
  {
    title: "队列名称",
    dataIndex: "queue_name",
    width: 200,
    ellipsis: true,
    render: (_, row) => <ResourceIdentity name={row.queue_name} display="name" />,
  },
  { title: "版本", dataIndex: "version", width: 100, ellipsis: true },
  {
    title: "供给状态",
    width: 120,
    ellipsis: true,
    render: (_, group) => (
      <StatusBadge
        value={
          group.admission === "ADMISSION_OPEN"
            ? "开放"
            : group.admission === "ADMISSION_CLOSED"
              ? "关闭"
              : group.admission
        }
        tone={group.admission === "ADMISSION_OPEN" ? "success" : "warning"}
      />
    ),
  },
];
interface GpuSupplyGroupsProps {
  pool: GpuPool;
}

export function GpuSupplyGroups({ pool }: GpuSupplyGroupsProps) {
  const [capacity, setCapacity] = useState<GpuSupplyGroup>();
  const cursor = useCursorPagination(JSON.stringify([pool.cluster_id, pool.pool_id]));
  const params = {
    cluster_id: pool.cluster_id,
    pool_id: pool.pool_id,
    page_size: cursor.limit,
    page_token: cursor.cursor,
  };
  const query = useQuery({
    queryKey: [...acceleratorKeys.all, "groups", params],
    queryFn: ({ signal }) => listGpuSupplyGroups(params, signal),
    enabled: Boolean(pool.cluster_id) && Boolean(pool.pool_id),
    meta: {
      errorNotification: { id: withId("gpu-groups", pool.pool_id), action: "GPU 供给组加载" },
    },
  });
  return (
    <>
      <TableSectionFrame>
        <ListDataTable
          rowKey="group_id"
          columns={columns}
          data={query.data?.items ?? []}
          loading={query.isFetching}
          pagination={cursor.getPagination(query.data?.next_page_token, query.isFetching)}
          tableLabel="GPU 供给组"
          emptyText="暂无 GPU 供给组"
          rowActions={[{ key: "capacity", label: "查看容量", onClick: setCapacity }]}
        />
      </TableSectionFrame>
      {capacity ? (
        <GpuGroupCapacityModal group={capacity} onCancel={() => setCapacity(undefined)} />
      ) : null}
    </>
  );
}
