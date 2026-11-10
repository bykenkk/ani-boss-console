import { useMemo } from "react";
import { createFileRoute, useCanGoBack, useRouter } from "@tanstack/react-router";
import { NamespaceDetailPage } from "@/components/cluster-ops/NamespaceDetailPage";
import { scopedResourceDefinitions } from "@/components/cluster-ops/ClusterScopedResourcesPage/constants";
import { validateScopedResourceDetailSearch } from "@/components/cluster-ops/ClusterScopedResourcesPage/search";

export const Route = createFileRoute("/cluster-namespaces/$namespaceName")({
  validateSearch: validateScopedResourceDetailSearch,
  component: function NamespaceDetailRoute() {
    const { namespaceName } = Route.useParams();
    const { cluster_id, page_size } = Route.useSearch();
    const navigate = Route.useNavigate();
    const router = useRouter();
    const canGoBack = useCanGoBack();
    const resourceRef = useMemo(
      () => ({
        cluster_id,
        type: scopedResourceDefinitions.namespaces.type,
        namespace: "",
        name: namespaceName,
      }),
      [cluster_id, namespaceName],
    );
    const onList = () => navigate({ to: "/cluster-namespaces", search: { cluster_id, page_size } });
    const onBack = () => {
      if (canGoBack) router.history.back();
      else onList();
    };
    return (
      <NamespaceDetailPage
        key={JSON.stringify(resourceRef)}
        resourceRef={resourceRef}
        onBack={onBack}
        onList={onList}
      />
    );
  },
  errorComponent: () => <p>资源定位参数无效，请从命名空间列表重新进入。</p>,
});
