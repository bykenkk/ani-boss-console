import { useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClusterOverviewPage } from "@/components/cluster-ops/ClusterOverviewPage";
export const Route = createFileRoute("/cluster-operations/")({
  validateSearch: (search: Record<string, unknown>): { cluster_id?: string } => {
    if (
      search.cluster_id !== undefined &&
      (typeof search.cluster_id !== "string" || !search.cluster_id)
    )
      throw new Error("集群定位参数无效");
    return { cluster_id: search.cluster_id as string | undefined };
  },
  component: function ClusterOverviewRoute() {
    const search = Route.useSearch(),
      navigate = Route.useNavigate();
    const onClusterChange = useCallback(
      (cluster_id: string) => {
        navigate({ search: { cluster_id }, replace: true });
      },
      [navigate],
    );
    return <ClusterOverviewPage clusterId={search.cluster_id} onClusterChange={onClusterChange} />;
  },
  errorComponent: () => <p>集群定位参数无效，请从集群运维菜单重新进入。</p>,
});
