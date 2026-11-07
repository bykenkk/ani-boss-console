import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClusterResourceDetailPage } from "@/components/cluster-ops/ClusterResourceDetailPage";
interface ClusterResourceDetailSearch {
  cluster_id: string;
  group: string;
  version: string;
  resource: string;
  namespace: string;
  name: string;
}
export const Route = createFileRoute("/cluster-operations/resources/detail")({
  validateSearch: (search: Record<string, unknown>): ClusterResourceDetailSearch => {
    for (const key of ["cluster_id", "version", "resource", "name"])
      if (typeof search[key] !== "string" || !search[key]) throw new Error("资源定位参数不完整");
    for (const key of ["group", "namespace"])
      if (search[key] !== undefined && typeof search[key] !== "string")
        throw new Error("资源定位参数无效");
    for (const key of ["cluster_id", "namespace", "name"])
      if (
        typeof search[key] === "string" &&
        (search[key].includes("/") ||
          [...search[key]].some(
            (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
          ) ||
          [".", ".."].includes(search[key]))
      )
        throw new Error("资源定位参数无效");
    return {
      cluster_id: search.cluster_id as string,
      group: (search.group as string) ?? "",
      version: search.version as string,
      resource: search.resource as string,
      namespace: (search.namespace as string) ?? "",
      name: search.name as string,
    };
  },
  component: function ClusterResourceDetailRoute() {
    const search = Route.useSearch();
    const ref = useMemo(
      () => ({
        cluster_id: search.cluster_id,
        type: { group: search.group, version: search.version, resource: search.resource },
        namespace: search.namespace,
        name: search.name,
      }),
      [search],
    );
    return <ClusterResourceDetailPage key={JSON.stringify(ref)} resourceRef={ref} />;
  },
  errorComponent: () => <p>资源定位参数无效，请从资源管理列表重新进入。</p>,
});
