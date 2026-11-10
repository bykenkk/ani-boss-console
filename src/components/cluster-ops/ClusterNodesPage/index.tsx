import { useEffect, useState } from "react";
import { Select } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ApiError, listClusters, listResources } from "@/api/cluster-ops";
import { clusterOpsKeys } from "@/api/cluster-ops/keys";
import {
  ResourceIdentity,
  ListDataTable,
  ListPageFrame,
  type ListColumn,
} from "@/components/common";
import { useCursorPagination } from "@/hooks/useCursorPagination";
import { formatDateTime } from "@/lib/date";
import { clusterNodeType } from "./constants";
import { nodeSummary } from "./node-summary";
import { NodeStatus } from "../NodeStatus";

export interface ClusterNodesSearch {
  cluster_id?: string;
  page_size?: number;
}

interface ClusterNodesPageProps {
  search: ClusterNodesSearch;
  onSearchChange: (value: ClusterNodesSearch) => void;
}

export function ClusterNodesPage({ search, onSearchChange }: ClusterNodesPageProps) {
  const navigate = useNavigate();
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
  const scope = JSON.stringify([clusterId, search.page_size]);
  // TODO(pagination-migration): 当前节点列表按 page_size/continue_token 翻页；后端支持 page/pageSize 和 items/total 后改用 useListPagination，并迁移路由中的 page_size。
  const paging = useCursorPagination(scope, search.page_size ?? 20);
  const expired = expiredScope === scope;
  const params = {
    ...clusterNodeType,
    namespace: "",
    all_namespaces: false,
    page_size: paging.limit,
    continue_token: paging.cursor,
  };
  const nodes = useQuery({
    queryKey: clusterOpsKeys.resources(clusterId, params),
    queryFn: ({ signal }) => listResources(clusterId, params, signal),
    enabled: Boolean(clusterId && !expired),
    meta: { errorNotification: { id: "cluster-resources", action: "读取集群节点" } },
  });
  if (nodes.error instanceof ApiError && nodes.error.reason === "LIST_EXPIRED" && !expired) {
    setExpiredScope(scope);
    paging.resetPagination();
  }
  const rows = (nodes.data?.items ?? []).map((doc) => ({ ...doc, summary: nodeSummary(doc) }));
  const columns: ListColumn<(typeof rows)[number]>[] = [
    {
      title: "名称",
      key: "name",
      dataIndex: "ref.name",
      width: 200,
      bodyCellStyle: { maxWidth: 200 },
      fixed: "left",
      ellipsis: true,
      render: (_, doc) => (
        <div className="flex min-w-0 flex-col gap-1">
          <ResourceIdentity
            name={doc.ref.name}
            display="name"
            onOpen={() =>
              navigate({
                to: "/cluster-nodes/$nodeName",
                params: { nodeName: doc.ref.name },
                search: { cluster_id: clusterId },
              })
            }
          />
          <span className="text-xs text-(--color-text-3)" title={doc.summary.internalIPs}>
            {doc.summary.internalIPs}
          </span>
        </div>
      ),
    },
    {
      title: "状态",
      width: 120,
      render: (_, { summary }) => <NodeStatus summary={summary} vertical />,
    },
    {
      title: "角色",
      width: 160,
      ellipsis: true,
      render: (_, doc) => doc.summary.roles,
    },
    {
      title: "配置（总容量）",
      width: 160,
      render: (_, doc) => (
        <div className="flex flex-col gap-1">
          <span>CPU {doc.summary.cpu}</span>
          <span className="text-xs text-(--color-text-3)">内存 {doc.summary.memory}</span>
        </div>
      ),
    },
    {
      title: "Kubelet 版本",
      width: 140,
      ellipsis: true,
      render: (_, doc) => doc.summary.kubeletVersion,
    },
    {
      title: "创建时间",
      render: (_, doc) => formatDateTime(doc.summary.createdAt),
    },
  ];
  return (
    <ListPageFrame
      header={{
        title: "节点管理",
        subtitle: "Kubernetes 集群节点及其运行状态",
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
        refresh: {
          spinning: nodes.isFetching,
          disabled: !clusterId,
          onClick: () => {
            setExpiredScope(undefined);
            paging.resetPagination();
            if (!paging.cursor && !expired) nodes.refetch();
            clusters.refetch();
          },
        },
      }}
    >
      <ListDataTable
        columns={columns}
        data={rows}
        rowKey="uid"
        loading={nodes.isFetching}
        pagination={{
          ...paging.getPagination(nodes.data?.next_continue_token, nodes.isFetching || expired),
          pageSizeOptions: [20, 50, 100, 200],
        }}
      />
    </ListPageFrame>
  );
}
