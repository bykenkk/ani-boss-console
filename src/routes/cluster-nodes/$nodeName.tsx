import { useMemo } from "react";
import { createFileRoute, useCanGoBack, useRouter } from "@tanstack/react-router";
import { ClusterNodeDetailPage } from "@/components/cluster-ops/ClusterNodeDetailPage";
import { clusterNodeType } from "@/components/cluster-ops/ClusterNodesPage/constants";

export const Route = createFileRoute("/cluster-nodes/$nodeName")({
  validateSearch: (search: Record<string, unknown>): { cluster_id: string } => {
    if (typeof search.cluster_id !== "string" || !search.cluster_id)
      throw new Error("集群定位参数无效");
    return { cluster_id: search.cluster_id };
  },
  component: function ClusterNodeDetailRoute() {
    const { nodeName } = Route.useParams();
    const { cluster_id } = Route.useSearch();
    const navigate = Route.useNavigate();
    const router = useRouter();
    const canGoBack = useCanGoBack();
    const resourceRef = useMemo(
      () => ({ cluster_id, type: clusterNodeType, namespace: "", name: nodeName }),
      [cluster_id, nodeName],
    );
    const onList = () => navigate({ to: "/cluster-nodes", search: { cluster_id } });
    const onBack = () => {
      if (canGoBack) router.history.back();
      else onList();
    };
    return (
      <ClusterNodeDetailPage
        key={JSON.stringify(resourceRef)}
        resourceRef={resourceRef}
        onBack={onBack}
        onList={onList}
      />
    );
  },
  errorComponent: () => <p>节点定位参数无效，请从节点管理列表重新进入。</p>,
});
