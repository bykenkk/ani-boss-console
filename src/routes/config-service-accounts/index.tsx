import { useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClusterConfigPage } from "@/components/cluster-ops/ClusterConfigPage";
import {
  validateConfigSearch,
  type ClusterConfigSearch,
} from "@/components/cluster-ops/ClusterConfigPage/search";

export const Route = createFileRoute("/config-service-accounts/")({
  validateSearch: validateConfigSearch,
  component: function ServiceAccountListRoute() {
    const search = Route.useSearch();
    const navigate = Route.useNavigate();
    const onSearchChange = useCallback(
      (value: ClusterConfigSearch) => {
        navigate({ search: value, replace: true });
      },
      [navigate],
    );
    return (
      <ClusterConfigPage
        kind="serviceaccounts"
        search={search}
        onSearchChange={onSearchChange}
        onOpen={(ref) =>
          navigate({
            to: "/config-service-accounts/$configName",
            params: { configName: ref.name },
            search: {
              cluster_id: ref.cluster_id,
              namespace: ref.namespace,
              page_size: search.page_size,
            },
          })
        }
      />
    );
  },
  errorComponent: () => <p>筛选参数无效，请从服务账户菜单重新进入。</p>,
});
