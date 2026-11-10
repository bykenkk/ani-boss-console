import { useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClusterScopedResourcesPage } from "@/components/cluster-ops/ClusterScopedResourcesPage";
import {
  validateScopedResourceSearch,
  type ClusterScopedResourceSearch,
} from "@/components/cluster-ops/ClusterScopedResourcesPage/search";

export const Route = createFileRoute("/cluster-namespaces/")({
  validateSearch: validateScopedResourceSearch,
  component: function NamespaceListRoute() {
    const search = Route.useSearch();
    const navigate = Route.useNavigate();
    const onSearchChange = useCallback(
      (value: ClusterScopedResourceSearch) => {
        navigate({ search: value, replace: true });
      },
      [navigate],
    );
    return (
      <ClusterScopedResourcesPage
        kind="namespaces"
        search={search}
        onSearchChange={onSearchChange}
        onOpen={(ref) =>
          navigate({
            to: "/cluster-namespaces/$namespaceName",
            params: { namespaceName: ref.name },
            search: { cluster_id: ref.cluster_id, page_size: search.page_size },
          })
        }
      />
    );
  },
  errorComponent: () => <p>筛选参数无效，请从命名空间菜单重新进入。</p>,
});
