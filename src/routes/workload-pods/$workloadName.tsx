import { useMemo } from "react";
import { createFileRoute, useCanGoBack, useRouter } from "@tanstack/react-router";
import { PodDetailPage } from "@/components/cluster-ops/PodDetailPage";
import { workloadDefinitions } from "@/components/cluster-ops/ClusterWorkloadsPage/constants";
import { validateWorkloadDetailSearch } from "@/components/cluster-ops/ClusterWorkloadsPage/search";

export const Route = createFileRoute("/workload-pods/$workloadName")({
  validateSearch: validateWorkloadDetailSearch,
  component: function PodDetailRoute() {
    const { workloadName } = Route.useParams();
    const { cluster_id, namespace, page_size } = Route.useSearch();
    const navigate = Route.useNavigate();
    const router = useRouter();
    const canGoBack = useCanGoBack();
    const resourceRef = useMemo(
      () => ({
        cluster_id,
        type: workloadDefinitions.pods.type,
        namespace: namespace,
        name: workloadName,
      }),
      [cluster_id, namespace, workloadName],
    );
    const onList = () =>
      navigate({ to: "/workload-pods", search: { cluster_id, namespace, page_size } });
    const onBack = () => {
      if (canGoBack) router.history.back();
      else onList();
    };
    return (
      <PodDetailPage
        key={JSON.stringify(resourceRef)}
        resourceRef={resourceRef}
        onBack={onBack}
        onList={onList}
      />
    );
  },
  errorComponent: () => <p>资源定位参数无效，请从容器组列表重新进入。</p>,
});
