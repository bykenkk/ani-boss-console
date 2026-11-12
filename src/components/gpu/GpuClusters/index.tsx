import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert } from "@arco-design/web-react";
import { useGpuTarget } from "@/hooks/useGpuTarget";
import { GpuTargetSummary } from "../GpuTargetSummary";
import { acceleratorKeys, listGpuClusters, type GpuCluster } from "@/api/accelerator";
import {
  ResourceIdentity,
  TableSectionFrame,
  ListDataTable,
  type ListColumn,
} from "@/components/common";
import { useCursorPagination } from "@/hooks/useCursorPagination";

import { InitializeGpuSupplyModal } from "../InitializeGpuSupplyModal";
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
  const { principal, can, target, permissions } = useGpuTarget();
  if (!principal || permissions.isPending) return <Alert content="正在读取平台主体与权限" />;
  if (!can("accelerator:cluster:list"))
    return (
      <Alert
        type="warning"
        content="需要 accelerator:cluster:list 权限才能查看 GPU 目标。运维读者可继续使用运维页面。"
      />
    );
  return (
    <GpuClustersForTarget
      key={`${principal}:${target.data?.connection_ref}:${target.data?.cluster_id}`}
      principal={principal}
      can={can}
      targetQuery={target}
    />
  );
}
interface GpuClustersForTargetProps {
  principal: string;
  can: (code: string) => boolean;
  targetQuery: ReturnType<typeof useGpuTarget>["target"];
}
function GpuClustersForTarget({ principal, can, targetQuery }: GpuClustersForTargetProps) {
  const [initializing, setInitializing] = useState<GpuCluster>();
  const [operation, setOperation] = useState<{ cluster: GpuCluster; id: string }>();
  const [resources, setResources] = useState<GpuCluster>();
  const cursor = useCursorPagination("gpu-clusters");
  const params = { page_size: cursor.limit, page_token: cursor.cursor };
  const query = useQuery({
    queryKey: [...acceleratorKeys.all, "clusters", principal, params],
    queryFn: ({ signal }) => listGpuClusters(params, signal),
    meta: { errorNotification: { id: "gpu-clusters", action: "GPU 集群加载" } },
  });
  return (
    <>
      <GpuTargetSummary
        target={targetQuery.data}
        principal={principal}
        canRegister={can("accelerator:cluster:register")}
        loading={targetQuery.isFetching}
        error={targetQuery.error}
        onRefresh={() => {
          targetQuery.refetch();
          query.refetch();
        }}
      />
      <TableSectionFrame
        toolbar={{
          refresh: {
            label: "刷新集群列表",
            onClick: () => query.refetch(),
            spinning: query.isFetching,
            disabled: query.isFetching,
          },
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
              disabled: (cluster) =>
                targetQuery.isError ||
                targetQuery.isFetching ||
                !can("accelerator:initialization:create") ||
                !can("accelerator:discovery:list") ||
                targetQuery.data?.registration_state !==
                  "GPU_TARGET_REGISTRATION_STATE_REGISTERED" ||
                cluster.cluster_id !== targetQuery.data.cluster_id ||
                cluster.connection_ref !== targetQuery.data.connection_ref,
              onClick: setInitializing,
            },
          ]}
        />
      </TableSectionFrame>
      {initializing ? (
        <InitializeGpuSupplyModal
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
