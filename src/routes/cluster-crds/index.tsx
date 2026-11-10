import { useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClusterScopedResourcesPage } from "@/components/cluster-ops/ClusterScopedResourcesPage";
import {
  validateScopedResourceSearch,
  type ClusterScopedResourceSearch,
} from "@/components/cluster-ops/ClusterScopedResourcesPage/search";

export const Route = createFileRoute("/cluster-crds/")({
  validateSearch: validateScopedResourceSearch,
  component: function CrdListRoute() {
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
        kind="crds"
        search={search}
        onSearchChange={onSearchChange}
        onOpen={(ref) =>
          navigate({
            to: "/cluster-crds/$crdName",
            params: { crdName: ref.name },
            search: { cluster_id: ref.cluster_id, page_size: search.page_size },
          })
        }
      />
    );
  },
  errorComponent: () => <p>筛选参数无效，请从自定义资源菜单重新进入。</p>,
});
