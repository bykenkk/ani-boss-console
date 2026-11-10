import { useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClusterConfigPage } from "@/components/cluster-ops/ClusterConfigPage";
import {
  validateConfigSearch,
  type ClusterConfigSearch,
} from "@/components/cluster-ops/ClusterConfigPage/search";

export const Route = createFileRoute("/config-maps/")({
  validateSearch: validateConfigSearch,
  component: function ConfigMapListRoute() {
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
        kind="configmaps"
        search={search}
        onSearchChange={onSearchChange}
        onOpen={(ref) =>
          navigate({
            to: "/config-maps/$configName",
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
  errorComponent: () => <p>筛选参数无效，请从配置字典菜单重新进入。</p>,
});
