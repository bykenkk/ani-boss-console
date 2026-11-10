import { useMemo } from "react";
import { createFileRoute, useCanGoBack, useRouter } from "@tanstack/react-router";
import { DeploymentDetailPage } from "@/components/cluster-ops/DeploymentDetailPage";
import { workloadDefinitions } from "@/components/cluster-ops/ClusterWorkloadsPage/constants";
import { validateWorkloadDetailSearch } from "@/components/cluster-ops/ClusterWorkloadsPage/search";

export const Route = createFileRoute("/workload-deployments/$workloadName")({
  validateSearch: validateWorkloadDetailSearch,
  component: function DeploymentDetailRoute() {
    const { workloadName } = Route.useParams();
    const { cluster_id, namespace, page_size } = Route.useSearch();
    const navigate = Route.useNavigate();
    const router = useRouter();
    const canGoBack = useCanGoBack();
    const resourceRef = useMemo(
      () => ({
        cluster_id,
        type: workloadDefinitions.deployments.type,
        namespace: namespace,
        name: workloadName,
      }),
      [cluster_id, namespace, workloadName],
    );
    const onList = () =>
      navigate({ to: "/workload-deployments", search: { cluster_id, namespace, page_size } });
    const onBack = () => {
      if (canGoBack) router.history.back();
      else onList();
    };
    return (
      <DeploymentDetailPage
        key={JSON.stringify(resourceRef)}
        resourceRef={resourceRef}
        onBack={onBack}
        onList={onList}
      />
    );
  },
  errorComponent: () => <p>资源定位参数无效，请从部署列表重新进入。</p>,
});
