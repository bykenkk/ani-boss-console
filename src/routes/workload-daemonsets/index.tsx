import { useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClusterWorkloadsPage } from "@/components/cluster-ops/ClusterWorkloadsPage";
import {
  validateWorkloadsSearch,
  type ClusterWorkloadsSearch,
} from "@/components/cluster-ops/ClusterWorkloadsPage/search";

export const Route = createFileRoute("/workload-daemonsets/")({
  validateSearch: validateWorkloadsSearch,
  component: function DaemonSetListRoute() {
    const search = Route.useSearch();
    const navigate = Route.useNavigate();
    const onSearchChange = useCallback(
      (value: ClusterWorkloadsSearch) => {
        navigate({ search: value, replace: true });
      },
      [navigate],
    );
    return (
      <ClusterWorkloadsPage
        kind="daemonsets"
        search={search}
        onSearchChange={onSearchChange}
        onOpen={(ref) =>
          navigate({
            to: "/workload-daemonsets/$workloadName",
            params: { workloadName: ref.name },
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
  errorComponent: () => <p>筛选参数无效，请从守护进程集菜单重新进入。</p>,
});
