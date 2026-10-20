import { useQuery } from "@tanstack/react-query";
import { acceleratorKeys, listGpuPools, type GpuCluster, type GpuPool } from "@/api/accelerator";
import { TableSectionFrame, ListDataTable, type ListColumn } from "@/components/common";
import { useCursorPagination } from "@/hooks/useCursorPagination";
import type { GpuAccess } from "../GpuResourcesPage/types";
import { withId } from "@/lib/id";

const columns: ListColumn<GpuPool>[] = [
  { title: "资源池", dataIndex: "display_name", width: 220, ellipsis: true },
  { title: "资源池 ID", dataIndex: "pool_id", width: 220, ellipsis: true },
  { title: "集群 ID", dataIndex: "cluster_id", width: 220, ellipsis: true },
];
export function GpuPools({
  cluster,
  onSelect,
  access,
}: {
  access: GpuAccess;
  cluster: GpuCluster;
  onSelect: (pool: GpuPool) => void;
}) {
  const cursor = useCursorPagination(cluster.cluster_id);
  const params = { page_size: cursor.limit, page_token: cursor.cursor };
  const query = useQuery({
    queryKey: [...acceleratorKeys.all, "pools", cluster.cluster_id, params],
    queryFn: ({ signal }) => listGpuPools({ ...params, cluster_id: cluster.cluster_id }, signal),
    enabled: Boolean(cluster.cluster_id) && access.can("accelerator:pool:list"),
    meta: {
      errorNotification: { id: withId("gpu-pools", cluster.cluster_id), action: "GPU 资源池加载" },
    },
  });
  return (
    <TableSectionFrame>
      <ListDataTable
        rowKey="pool_id"
        columns={columns}
        data={query.data?.items ?? []}
        loading={query.isFetching}
        pagination={cursor.getPagination(query.data?.next_page_token, query.isFetching)}
        emptyText="暂无 GPU 资源池"
        tableLabel="GPU 资源池"
        rowActions={[
          {
            key: "groups",
            label: "查看供给组",
            visible: () => access.can("accelerator:supply-group:list"),
            onClick: onSelect,
          },
        ]}
      />
    </TableSectionFrame>
  );
}
