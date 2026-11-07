import { useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ClusterResourcesPage,
  type ClusterResourcesSearch,
} from "@/components/cluster-ops/ClusterResourcesPage";
export const Route = createFileRoute("/cluster-operations/resources/")({
  validateSearch: (search: Record<string, unknown>): ClusterResourcesSearch => {
    const result: ClusterResourcesSearch = {};
    for (const key of [
      "cluster_id",
      "group",
      "version",
      "resource",
      "namespace",
      "name",
      "label_selector",
      "field_selector",
    ] as const) {
      if (search[key] !== undefined) {
        if (typeof search[key] !== "string") throw new Error("资源筛选参数无效");
        result[key] = search[key];
      }
    }
    if (
      ["group", "version", "resource"].some((key) => search[key] !== undefined) &&
      (!result.version || !result.resource)
    )
      throw new Error("资源定位参数不完整");
    if (
      result.cluster_id === "" ||
      result.version === "" ||
      result.resource === "" ||
      (result.resource !== undefined) !== (result.version !== undefined)
    )
      throw new Error("资源定位参数不完整");
    if (search.all_namespaces !== undefined) {
      if (typeof search.all_namespaces !== "boolean") throw new Error("Namespace 参数无效");
      result.all_namespaces = search.all_namespaces;
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
  component: function ClusterResourcesRoute() {
    const search = Route.useSearch(),
      navigate = Route.useNavigate();
    const onSearchChange = useCallback(
      (value: ClusterResourcesSearch) => {
        navigate({ search: value, replace: true });
      },
      [navigate],
    );
    return <ClusterResourcesPage search={search} onSearchChange={onSearchChange} />;
  },
  errorComponent: () => <p>资源定位或筛选参数无效，请从资源管理菜单重新进入。</p>,
});
