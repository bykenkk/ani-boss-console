import { useEffect, useState } from "react";
import { Select } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import {
  ApiError,
  listClusters,
  listResources,
  type ClusterOpsResourceRef,
} from "@/api/cluster-ops";
import { clusterOpsKeys } from "@/api/cluster-ops/keys";
import { ListPageFrame } from "@/components/common";
import { useCursorPagination } from "@/hooks/useCursorPagination";
import { NamespacePicker } from "../NamespacePicker";
import { configDefinitions, type ClusterConfigKind } from "./constants";
import type { ClusterConfigSearch } from "./search";
import { ConfigTable } from "./ConfigTable";

interface ClusterConfigPageProps {
  kind: ClusterConfigKind;
  search: ClusterConfigSearch;
  onSearchChange: (value: ClusterConfigSearch) => void;
  onOpen: (ref: ClusterOpsResourceRef) => void;
}

export function ClusterConfigPage({
  kind,
  search,
  onSearchChange,
  onOpen,
}: ClusterConfigPageProps) {
  const definition = configDefinitions[kind];
  const [expiredScope, setExpiredScope] = useState<string>();
  const clusterId = search.cluster_id ?? "";
  const clusters = useQuery({
    queryKey: clusterOpsKeys.clusters(),
    queryFn: ({ signal }) => listClusters(signal),
    meta: { errorNotification: { id: "cluster-list", action: "读取集群" } },
  });
  useEffect(() => {
    if (!clusterId && clusters.data?.items[0])
      onSearchChange({ ...search, cluster_id: clusters.data.items[0].cluster_id });
  }, [clusterId, clusters.data, onSearchChange, search]);
  const scope = JSON.stringify([kind, clusterId, search.namespace, search.page_size]);
  // TODO(pagination-migration): 当前配置列表使用通用资源接口的 page_size/continue_token；后端提供 page/pageSize 和 items/total 后改用 useListPagination，并迁移路由中的 page_size。
  const paging = useCursorPagination(scope, search.page_size ?? 20);
  const expired = expiredScope === scope;
  const params = {
    ...definition.type,
    namespace: search.namespace || undefined,
    all_namespaces: search.namespace ? undefined : true,
    page_size: paging.limit,
    continue_token: paging.cursor,
  };
  const resources = useQuery({
    queryKey: clusterOpsKeys.resources(clusterId, params),
    queryFn: ({ signal }) => listResources(clusterId, params, signal),
    enabled: Boolean(clusterId && !expired),
    meta: { errorNotification: { id: "cluster-resources", action: "读取配置资源" } },
  });
  if (
    resources.error instanceof ApiError &&
    resources.error.reason === "LIST_EXPIRED" &&
    !expired
  ) {
    setExpiredScope(scope);
    paging.resetPagination();
  }
  return (
    <ListPageFrame
      header={{
        title: definition.title,
        subtitle: definition.subtitle,
        extra: (
          <div className="flex items-center gap-3">
            <Select
              aria-label="集群"
              placeholder="选择集群"
              value={clusterId || undefined}
              loading={clusters.isFetching}
              filterOption={false}
              onVisibleChange={(visible) => {
                if (visible && !clusters.isFetching) clusters.refetch();
              }}
              options={(clusters.data?.items ?? []).map((cluster) => ({
                value: cluster.cluster_id,
                label: cluster.display_name || cluster.cluster_id,
              }))}
              onChange={(value) => onSearchChange({ cluster_id: value })}
            />
          </div>
        ),
      }}
      toolbar={{
        filters: (
          <NamespacePicker
            clusterId={clusterId}
            value={search.namespace ?? ""}
            allowAll
            disabled={!clusterId}
            onChange={(namespace) =>
              onSearchChange({ ...search, namespace: namespace || undefined })
            }
          />
        ),
        refresh: {
          spinning: resources.isFetching,
          disabled: !clusterId,
          onClick: () => {
            setExpiredScope(undefined);
            paging.resetPagination();
            if (!paging.cursor && !expired) resources.refetch();
            clusters.refetch();
          },
        },
      }}
    >
      <ConfigTable
        kind={kind}
        resources={resources.data?.items ?? []}
        loading={resources.isFetching}
        onOpen={onOpen}
        pagination={{
          ...paging.getPagination(
            resources.data?.next_continue_token,
            resources.isFetching || expired,
          ),
          pageSizeOptions: [20, 50, 100, 200],
        }}
      />
    </ListPageFrame>
  );
}
