import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select } from "@arco-design/web-react";
import { getClusterOverview, listClusters } from "@/api/cluster-ops";
import { clusterOpsKeys } from "@/api/cluster-ops/keys";
import { ToolbarIconButton, ResourcePageFrame } from "@/components/common";
import { formatDateTime } from "@/lib/date";
import { ClusterOverviewMetrics } from "./ClusterOverviewMetrics";
import { ClusterResourceCapacity } from "./ClusterResourceCapacity";
import { ClusterPodPhases } from "./ClusterPodPhases";

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
  const showSkeleton = !data && (clusters.isFetching || overview.isFetching);
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
              filterOption={false}
              onVisibleChange={(visible) => {
                if (visible && !clusters.isFetching) clusters.refetch();
              }}
              options={(clusters.data?.items ?? []).map((cluster) => ({
                value: cluster.cluster_id,
                label: cluster.display_name || cluster.cluster_id,
              }))}
              onChange={onClusterChange}
            />
            <ToolbarIconButton
              label="刷新"
              spinning={overview.isFetching || clusters.isFetching}
              disabled={!clusterId || overview.isFetching}
              onClick={() => {
                clusters.refetch();
                overview.refetch();
              }}
            />
          </div>
        ),
      }}
    >
      <div className="@container/overview flex flex-col gap-4">
        <ClusterOverviewMetrics data={data} showSkeleton={showSkeleton} />
        <ClusterResourceCapacity data={data} showSkeleton={showSkeleton} />
        <ClusterPodPhases counts={data?.pod_phase_counts} showSkeleton={showSkeleton} />
        <div className="text-right text-xs text-(--color-text-3)">
          采样时间 {formatDateTime(data?.sampled_at)}
        </div>
      </div>
    </ResourcePageFrame>
  );
}
