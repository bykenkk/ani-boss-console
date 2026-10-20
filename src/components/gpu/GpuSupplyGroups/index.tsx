import { useQuery } from "@tanstack/react-query";
import {
  acceleratorKeys,
  listGpuSupplyGroups,
  type GpuPool,
  type GpuSupplyGroup,
} from "@/api/accelerator";
import {
  TableSectionFrame,
  ListDataTable,
  StatusBadge,
  type ListColumn,
} from "@/components/common";
import { useCursorPagination } from "@/hooks/useCursorPagination";
import { withId } from "@/lib/id";
import type { GpuAccess } from "../GpuResourcesPage/types";
const columns: ListColumn<GpuSupplyGroup>[] = [
  { title: "供给组名称", dataIndex: "display_name", width: 220, ellipsis: true },
  { title: "供给组 ID", dataIndex: "group_id", width: 220, ellipsis: true },
  { title: "GPU 型号", dataIndex: "model_key", width: 180, ellipsis: true },
  {
    title: "模式",
    render: (_, group) => (group.mode === "SHARED_FIXED" ? "共享" : "整卡"),
    width: 100,
    ellipsis: true,
  },
  {
    title: "节点名称",
    render: (_, group) =>
      group.nodes?.length ? group.nodes.map((node) => node.name).join("、") : "-",
    width: 200,
    ellipsis: true,
  },
  {
    title: "节点 UID",
    render: (_, group) =>
      group.nodes?.length ? group.nodes.map((node) => node.uid).join("、") : "-",
    width: 220,
    ellipsis: true,
  },
  {
    title: "基线 ID",
    dataIndex: "baseline.baseline_id",
    width: 220,
    ellipsis: true,
  },
  { title: "队列名称", dataIndex: "queue_name", width: 200, ellipsis: true },
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
export function GpuSupplyGroups({ pool, access }: { pool: GpuPool; access: GpuAccess }) {
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
    enabled:
      Boolean(pool.cluster_id) &&
      Boolean(pool.pool_id) &&
      access.can("accelerator:supply-group:list"),
    meta: {
      errorNotification: { id: withId("gpu-groups", pool.pool_id), action: "GPU 供给组加载" },
    },
  });
  return (
    <TableSectionFrame>
      <ListDataTable
        rowKey="group_id"
        columns={columns}
        data={query.data?.items ?? []}
        loading={query.isFetching}
        pagination={cursor.getPagination(query.data?.next_page_token, query.isFetching)}
        tableLabel="GPU 供给组"
        emptyText="暂无 GPU 供给组"
      />
    </TableSectionFrame>
  );
}
