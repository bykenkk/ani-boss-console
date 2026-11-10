import { useMemo } from "react";
import { createFileRoute, useCanGoBack, useRouter } from "@tanstack/react-router";
import { ServiceDetailPage } from "@/components/cluster-ops/ServiceDetailPage";
import { workloadDefinitions } from "@/components/cluster-ops/ClusterWorkloadsPage/constants";
import { validateWorkloadDetailSearch } from "@/components/cluster-ops/ClusterWorkloadsPage/search";

export const Route = createFileRoute("/workload-services/$workloadName")({
  validateSearch: validateWorkloadDetailSearch,
  component: function ServiceDetailRoute() {
    const { workloadName } = Route.useParams();
    const { cluster_id, namespace, page_size } = Route.useSearch();
    const navigate = Route.useNavigate();
    const router = useRouter();
    const canGoBack = useCanGoBack();
    const resourceRef = useMemo(
      () => ({
        cluster_id,
        type: workloadDefinitions.services.type,
        namespace: namespace,
        name: workloadName,
      }),
      [cluster_id, namespace, workloadName],
    );
    const onList = () =>
      navigate({ to: "/workload-services", search: { cluster_id, namespace, page_size } });
    const onBack = () => {
      if (canGoBack) router.history.back();
      else onList();
    };
    return (
      <ServiceDetailPage
        key={JSON.stringify(resourceRef)}
        resourceRef={resourceRef}
        onBack={onBack}
        onList={onList}
      />
    );
  },
  errorComponent: () => <p>资源定位参数无效，请从服务列表重新进入。</p>,
});
