import { useMemo } from "react";
import { createFileRoute, useCanGoBack, useRouter } from "@tanstack/react-router";
import { CustomResourceDefinitionDetailPage } from "@/components/cluster-ops/CustomResourceDefinitionDetailPage";
import { scopedResourceDefinitions } from "@/components/cluster-ops/ClusterScopedResourcesPage/constants";
import { validateScopedResourceDetailSearch } from "@/components/cluster-ops/ClusterScopedResourcesPage/search";

export const Route = createFileRoute("/cluster-crds/$crdName")({
  validateSearch: validateScopedResourceDetailSearch,
  component: function CustomResourceDefinitionDetailRoute() {
    const { crdName } = Route.useParams();
    const { cluster_id, page_size } = Route.useSearch();
    const navigate = Route.useNavigate();
    const router = useRouter();
    const canGoBack = useCanGoBack();
    const resourceRef = useMemo(
      () => ({
        cluster_id,
        type: scopedResourceDefinitions.crds.type,
        namespace: "",
        name: crdName,
      }),
      [cluster_id, crdName],
    );
    const onList = () => navigate({ to: "/cluster-crds", search: { cluster_id, page_size } });
    const onBack = () => {
      if (canGoBack) router.history.back();
      else onList();
    };
    return (
      <CustomResourceDefinitionDetailPage
        key={JSON.stringify(resourceRef)}
        resourceRef={resourceRef}
        onBack={onBack}
        onList={onList}
      />
    );
  },
  errorComponent: () => <p>资源定位参数无效，请从自定义资源列表重新进入。</p>,
});
