import { useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClusterConfigPage } from "@/components/cluster-ops/ClusterConfigPage";
import {
  validateConfigSearch,
  type ClusterConfigSearch,
} from "@/components/cluster-ops/ClusterConfigPage/search";

export const Route = createFileRoute("/config-secrets/")({
  validateSearch: validateConfigSearch,
  component: function SecretListRoute() {
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
        kind="secrets"
        search={search}
        onSearchChange={onSearchChange}
        onOpen={(ref) =>
          navigate({
            to: "/config-secrets/$configName",
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
  errorComponent: () => <p>筛选参数无效，请从保密字典菜单重新进入。</p>,
});
