import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@arco-design/web-react";
import { acceleratorKeys, listGpuClusters, type GpuCluster } from "@/api/accelerator";
import {
  ResourceIdentity,
  TableSectionFrame,
  ListDataTable,
  type ListColumn,
} from "@/components/common";
import { useCursorPagination } from "@/hooks/useCursorPagination";

import { RegisterGpuClusterModal } from "../RegisterGpuClusterModal";
import { InitializeGpuPoolModal } from "../InitializeGpuPoolModal";
import { GpuInitializationOperationModal } from "../GpuInitializationOperationModal";
import { GpuClusterResourcesModal } from "../GpuClusterResourcesModal";
const columns: ListColumn<GpuCluster>[] = [
  {
    title: "集群 / ID",
    dataIndex: "display_name",
    width: 200,
    ellipsis: true,
    render: (_, row) => (
      <ResourceIdentity name={row.display_name} id={row.cluster_id} idLabel="资源 ID" />
    ),
  },

  { title: "连接引用", dataIndex: "connection_ref", width: 260, ellipsis: true },
  { title: "版本", dataIndex: "version", width: 100, ellipsis: true },
];
export function GpuClusters() {
  const [creating, setCreating] = useState(false);
  const [initializing, setInitializing] = useState<GpuCluster>();
  const [operation, setOperation] = useState<{ cluster: GpuCluster; id: string }>();
  const [resources, setResources] = useState<GpuCluster>();
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
          refresh: {
            label: "刷新集群列表",
            onClick: () => query.refetch(),
            spinning: query.isFetching,
            disabled: query.isFetching,
          },
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
          rowActions={[
            {
              key: "initialize",
              label: "初始化资源池",
              disabled: (cluster) => !cluster.connection_ref,
              onClick: setInitializing,
            },
          ]}
        />
      </TableSectionFrame>
      {creating ? <RegisterGpuClusterModal onCancel={() => setCreating(false)} /> : null}
      {initializing ? (
        <InitializeGpuPoolModal
          cluster={initializing}
          onCancel={() => setInitializing(undefined)}
          onOperation={(id) => {
            setOperation({ cluster: initializing, id });
            setInitializing(undefined);
          }}
        />
      ) : null}
      {operation ? (
        <GpuInitializationOperationModal
          cluster={operation.cluster}
          operationId={operation.id}
          onCancel={() => setOperation(undefined)}
          onViewResources={() => {
            setResources(operation.cluster);
            setOperation(undefined);
          }}
        />
      ) : null}
      {resources ? (
        <GpuClusterResourcesModal cluster={resources} onCancel={() => setResources(undefined)} />
      ) : null}
    </>
  );
}
