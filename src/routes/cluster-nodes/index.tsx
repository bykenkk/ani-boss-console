import { useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ClusterNodesPage,
  type ClusterNodesSearch,
} from "@/components/cluster-ops/ClusterNodesPage";

export const Route = createFileRoute("/cluster-nodes/")({
  validateSearch: (search: Record<string, unknown>): ClusterNodesSearch => {
    const result: ClusterNodesSearch = {};
    if (search.cluster_id !== undefined) {
      if (typeof search.cluster_id !== "string" || !search.cluster_id)
        throw new Error("集群定位参数无效");
      result.cluster_id = search.cluster_id;
    }
    if (search.page_size !== undefined) {
      if (
        typeof search.page_size !== "number" ||
        !Number.isInteger(search.page_size) ||
        search.page_size < 1 ||
        search.page_size > 200
      )
        throw new Error("分页参数无效");
      result.page_size = search.page_size;
    }
    return result;
  },
  component: function ClusterNodesRoute() {
    const search = Route.useSearch();
    const navigate = Route.useNavigate();
    const onSearchChange = useCallback(
      (value: ClusterNodesSearch) => {
        navigate({ search: value, replace: true });
      },
      [navigate],
    );
    return <ClusterNodesPage search={search} onSearchChange={onSearchChange} />;
  },
  errorComponent: () => <p>集群定位或分页参数无效，请从节点管理菜单重新进入。</p>,
});
