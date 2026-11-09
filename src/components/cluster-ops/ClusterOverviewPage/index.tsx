import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Descriptions, Select } from "@arco-design/web-react";
import { getClusterOverview, listClusters } from "@/api/cluster-ops";
import { clusterOpsKeys } from "@/api/cluster-ops/keys";
import { ResourcePageFrame, DataTable } from "@/components/common";
import { formatDateTime } from "@/lib/date";

interface ClusterOverviewPageProps {
  clusterId?: string;
  onClusterChange: (value: string) => void;
}
export function ClusterOverviewPage({ clusterId, onClusterChange }: ClusterOverviewPageProps) {
  const clusters = useQuery({
    queryKey: clusterOpsKeys.clusters(),
    queryFn: ({ signal }) => listClusters(signal),
    meta: { errorNotification: { id: "cluster-list", action: "读取集群" } },
  });
  useEffect(() => {
    if (!clusterId && clusters.data?.items[0]) onClusterChange(clusters.data.items[0].cluster_id);
  }, [clusterId, clusters.data, onClusterChange]);
  const overview = useQuery({
    queryKey: clusterOpsKeys.overview(clusterId ?? ""),
    queryFn: ({ signal }) => getClusterOverview(clusterId!, signal),
    enabled: Boolean(clusterId),
    meta: { errorNotification: { id: "cluster-overview", action: "读取集群概览" } },
  });
  const data = overview.data;
  const capacities = Array.from(
    new Set([...Object.keys(data?.capacity ?? {}), ...Object.keys(data?.allocatable ?? {})]),
  ).map((name) => ({ name, capacity: data?.capacity[name], allocatable: data?.allocatable[name] }));
  return (
    <ResourcePageFrame
      header={{
        title: "集群概览",
        subtitle: "Kubernetes 原生资源快照",
        extra: (
          <div className="flex items-center gap-3">
            <Select
              aria-label="集群"
              placeholder="选择集群"
              value={clusterId}
              options={(clusters.data?.items ?? []).map((cluster) => ({
                value: cluster.cluster_id,
                label: cluster.display_name || cluster.cluster_id,
              }))}
              onChange={onClusterChange}
            />
            <Button
              onClick={() => {
                clusters.refetch();
                overview.refetch();
              }}
            >
              刷新
            </Button>
          </div>
        ),
      }}
    >
      <Card loading={overview.isFetching}>
        <Descriptions
          column={3}
          data={[
            { label: "Kubernetes 版本", value: data?.kubernetes_version ?? "-" },
            {
              label: "节点 / Ready",
              value: data ? `${data.nodes_total} / ${data.nodes_ready}` : "-",
            },
            { label: "Namespace", value: data?.namespaces_total ?? "-" },
            { label: "Pod", value: data?.pods_total ?? "-" },
            { label: "采样时间", value: formatDateTime(data?.sampled_at) },
            ...Object.entries(data?.pod_phase_counts ?? {}).map(([phase, count]) => ({
              label: `Pod ${phase}`,
              value: count,
            })),
          ]}
        />
      </Card>
      <Card>
        <DataTable
          header={{ title: "节点资源容量" }}
          data={capacities}
          rowKey="name"
          columns={[
            { title: "资源", dataIndex: "name", width: 200 },
            { title: "Capacity", dataIndex: "capacity", width: 200 },
            { title: "Allocatable", dataIndex: "allocatable", width: 200 },
          ]}
          pagination={false}
        />
      </Card>
    </ResourcePageFrame>
  );
}
