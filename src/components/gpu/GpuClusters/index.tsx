import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@arco-design/web-react";
import { acceleratorKeys, listGpuClusters, type GpuCluster } from "@/api/accelerator";
import { TableSectionFrame, ListDataTable, type ListColumn } from "@/components/common";
import { useCursorPagination } from "@/hooks/useCursorPagination";

import { RegisterGpuClusterModal } from "../RegisterGpuClusterModal";
const columns: ListColumn<GpuCluster>[] = [
  { title: "集群", dataIndex: "display_name", width: 220, ellipsis: true },
  { title: "集群 ID", dataIndex: "cluster_id", width: 220, ellipsis: true },
  { title: "连接引用", dataIndex: "connection_ref", width: 260, ellipsis: true },
  { title: "版本", dataIndex: "version", width: 100, ellipsis: true },
];
export function GpuClusters() {
  const [creating, setCreating] = useState(false);
  const cursor = useCursorPagination("gpu-clusters");
  const params = { page_size: cursor.limit, page_token: cursor.cursor };
  const query = useQuery({
    queryKey: [...acceleratorKeys.all, "clusters", params],
    queryFn: ({ signal }) => listGpuClusters(params, signal),
    meta: { errorNotification: { id: "gpu-clusters", action: "GPU 集群加载" } },
  });
  return (
    <>
      <TableSectionFrame
        toolbar={{
          actions: (
            <Button type="primary" onClick={() => setCreating(true)}>
              登记集群
            </Button>
          ),
        }}
      >
        <ListDataTable
          rowKey="cluster_id"
          columns={columns}
          data={query.data?.items ?? []}
          loading={query.isFetching}
          pagination={cursor.getPagination(query.data?.next_page_token, query.isFetching)}
          emptyText="暂无可展示的 GPU 集群"
          tableLabel="GPU 集群"
        />
      </TableSectionFrame>
      {creating ? <RegisterGpuClusterModal onCancel={() => setCreating(false)} /> : null}
    </>
  );
}
