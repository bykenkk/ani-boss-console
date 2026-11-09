import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Alert, Button, Input, Select } from "@arco-design/web-react";
import {
  ApiError,
  listClusters,
  listResources,
  listResourceTypes,
  type ClusterOpsResourceDocument,
} from "@/api/cluster-ops";
import { clusterOpsKeys } from "@/api/cluster-ops/keys";
import { ListDataTable, ListPageFrame, StatusBadge, type ListColumn } from "@/components/common";
import { useCursorPagination } from "@/hooks/useCursorPagination";
import { formatDateTime } from "@/lib/date";
import {
  descriptorLabel,
  field,
  nativeObject,
  readOnlyMessage,
  resourceDetailSearch,
  resourceState,
  sameResourceType,
  typeKey,
} from "../model";
import { NamespacePicker } from "../NamespacePicker";
import { ResourceCreateModal } from "../ResourceCreateModal";

export interface ClusterResourcesSearch {
  cluster_id?: string;
  group?: string;
  version?: string;
  resource?: string;
  namespace?: string;
  name?: string;
  all_namespaces?: boolean;
  label_selector?: string;
  field_selector?: string;
  page_size?: number;
}
interface ClusterResourcesPageProps {
  search: ClusterResourcesSearch;
  onSearchChange: (value: ClusterResourcesSearch) => void;
}
export function ClusterResourcesPage({ search, onSearchChange }: ClusterResourcesPageProps) {
  const navigate = useNavigate();
  const [create, setCreate] = useState(false);
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
  const types = useQuery({
    queryKey: clusterOpsKeys.resourceTypes(clusterId),
    queryFn: ({ signal }) => listResourceTypes(clusterId, signal),
    enabled: Boolean(clusterId),
    meta: { errorNotification: { id: "cluster-resource-types", action: "发现资源类型" } },
  });
  const descriptor = types.data?.items.find((item) =>
    sameResourceType(item.type, {
      group: search.group ?? "",
      version: search.version ?? "",
      resource: search.resource ?? "",
    }),
  );
  useEffect(() => {
    if (!search.resource && types.data) {
      const initial =
        types.data.items.find(
          (item) =>
            item.type.group === "" && item.type.version === "v1" && item.type.resource === "pods",
        ) ?? types.data.items.find((item) => item.actions.includes("list"));
      if (initial)
        onSearchChange({
          ...search,
          ...initial.type,
          all_namespaces: search.all_namespaces ?? Boolean(initial.namespaced && !search.namespace),
        });
    }
  }, [search, types.data, onSearchChange]);
  const scope = JSON.stringify([
    clusterId,
    search.group,
    search.version,
    search.resource,
    search.namespace,
    search.all_namespaces,
    search.name,
    search.label_selector,
    search.field_selector,
    search.page_size,
  ]);
  const paging = useCursorPagination(scope, search.page_size ?? 50, "cursor");
  const expired = expiredScope === scope;
  const params = {
    group: search.group ?? "",
    version: search.version ?? "",
    resource: search.resource ?? "",
    namespace: search.namespace ?? "",
    all_namespaces: search.all_namespaces ?? Boolean(descriptor?.namespaced && !search.namespace),
    name: search.name || undefined,
    label_selector: search.label_selector || undefined,
    field_selector: search.field_selector || undefined,
    page_size: paging.limit,
    continue_token: paging.cursor,
  };
  const resources = useQuery({
    queryKey: clusterOpsKeys.resources(clusterId, params),
    queryFn: ({ signal }) => listResources(clusterId, params, signal),
    enabled: Boolean(clusterId && descriptor?.actions.includes("list") && !expired),
    meta: { errorNotification: { id: "cluster-resources", action: "读取集群资源" } },
  });
  if (
    resources.error instanceof ApiError &&
    resources.error.reason === "LIST_EXPIRED" &&
    !expired
  ) {
    setExpiredScope(scope);
    paging.resetPagination();
  }
  const columns: ListColumn<ClusterOpsResourceDocument>[] = [
    {
      title: "名称",
      key: "name",
      dataIndex: "ref.name",
      width: 200,
      ellipsis: true,
      render: (_, doc) => (
        <Button
          type="text"
          onClick={() =>
            navigate({
              to: "/cluster-operations/resources/detail",
              search: resourceDetailSearch(doc.ref),
            })
          }
        >
          {doc.ref.name}
        </Button>
      ),
    },
    ...(descriptor?.namespaced
      ? [{ title: "Namespace", dataIndex: "ref.namespace", width: 180, ellipsis: true }]
      : []),
    { title: "状态", width: 120, render: (_, doc) => <StatusBadge value={resourceState(doc)} /> },
    {
      title: "只读原因",
      width: 220,
      ellipsis: true,
      render: (_, doc) =>
        doc.read_only ? readOnlyMessage(doc.read_only_reason) || "当前资源只读" : "-",
    },
    {
      title: "创建时间",
      width: 180,
      render: (_, doc) =>
        formatDateTime(String(field(nativeObject(doc), "metadata", "creationTimestamp") ?? "")),
    },
  ];
  return (
    <>
      <ListPageFrame
        header={{ title: "资源管理" }}
        toolbar={{
          filters: (
            <div className="flex flex-wrap items-center gap-3">
              <Select
                aria-label="集群"
                placeholder="选择集群"
                value={clusterId || undefined}
                options={(clusters.data?.items ?? []).map((cluster) => ({
                  value: cluster.cluster_id,
                  label: cluster.display_name || cluster.cluster_id,
                }))}
                onChange={(value) => onSearchChange({ cluster_id: value })}
              />
              <Select
                aria-label="资源类型"
                placeholder="选择资源类型"
                value={descriptor ? typeKey(descriptor.type) : undefined}
                options={(types.data?.items ?? []).map((item) => ({
                  value: typeKey(item.type),
                  label: descriptorLabel(item),
                }))}
                showSearch
                onChange={(value) => {
                  const item = types.data?.items.find((entry) => typeKey(entry.type) === value);
                  if (item)
                    onSearchChange({
                      cluster_id: clusterId,
                      ...item.type,
                      all_namespaces: item.namespaced,
                    });
                }}
              />
              {descriptor?.namespaced ? (
                <NamespacePicker
                  clusterId={clusterId}
                  value={search.namespace ?? ""}
                  allowAll
                  onChange={(namespace) =>
                    onSearchChange({ ...search, namespace, all_namespaces: !namespace })
                  }
                />
              ) : null}
              <Input.Search
                aria-label="精确资源名称"
                placeholder="精确资源名称"
                defaultValue={search.name}
                key={JSON.stringify([clusterId, search.resource])}
                onSearch={(name) => onSearchChange({ ...search, name })}
                searchButton="查询"
              />
              <Input.Search
                aria-label="Label selector"
                placeholder="Label selector"
                defaultValue={search.label_selector}
                onSearch={(label_selector) => onSearchChange({ ...search, label_selector })}
              />
              <Input.Search
                aria-label="Field selector"
                placeholder="Field selector"
                defaultValue={search.field_selector}
                onSearch={(field_selector) => onSearchChange({ ...search, field_selector })}
              />
            </div>
          ),
          actions: descriptor?.actions.includes("create") ? (
            <Button type="primary" onClick={() => setCreate(true)}>
              创建资源
            </Button>
          ) : undefined,
          refresh: {
            spinning: resources.isFetching,
            onClick: () => {
              setExpiredScope(undefined);
              paging.resetPagination();
              if (!paging.cursor && !expired) resources.refetch();
              types.refetch();
            },
          },
        }}
      >
        {search.resource && types.data && !descriptor ? (
          <Alert type="warning" content="指定的资源类型当前不可用，请明确选择其他类型" />
        ) : null}
        <ListDataTable
          columns={columns}
          data={resources.data?.items ?? []}
          rowKey={(doc) => JSON.stringify(doc.ref)}
          loading={resources.isFetching}
          pagination={paging.getPagination(
            resources.data?.next_continue_token,
            resources.isFetching || expired,
          )}
        />
      </ListPageFrame>
      {create && descriptor ? (
        <ResourceCreateModal
          clusterId={clusterId}
          descriptor={descriptor}
          initialNamespace={search.namespace ?? ""}
          onCancel={() => setCreate(false)}
        />
      ) : null}
    </>
  );
}
