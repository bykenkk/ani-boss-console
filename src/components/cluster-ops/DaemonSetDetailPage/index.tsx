import { Button } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { getResource, listResourceTypes, type ClusterOpsResourceRef } from "@/api/cluster-ops";
import { clusterOpsKeys } from "@/api/cluster-ops/keys";
import {
  ResourceIdentity,
  DetailPageFrame,
  StatusBadge,
  type DetailTab,
} from "@/components/common";
import { ResourceInfo } from "../ResourceInfo";
import { ResourceEvents } from "../ResourceEvents";
import { RelatedResources } from "../RelatedResources";
import { ResourceManifest } from "../ResourceManifest";
import { workloadSummary } from "../ClusterWorkloadsPage/workload-summary";

interface DaemonSetDetailPageProps {
  resourceRef: ClusterOpsResourceRef;
  onBack: () => void;
  onList: () => void;
}

export function DaemonSetDetailPage({ resourceRef, onBack, onList }: DaemonSetDetailPageProps) {
  const query = useQuery({
    queryKey: clusterOpsKeys.resource(resourceRef),
    queryFn: ({ signal }) => getResource(resourceRef, { signal }),
    meta: { errorNotification: { id: "cluster-resource", action: "读取守护进程集详情" } },
  });
  const types = useQuery({
    queryKey: clusterOpsKeys.resourceTypes(resourceRef.cluster_id),
    queryFn: ({ signal }) => listResourceTypes(resourceRef.cluster_id, signal),
    meta: { errorNotification: { id: "cluster-resource-types", action: "发现资源类型" } },
  });
  const doc = query.data?.resource;
  const summary = doc ? workloadSummary(doc) : undefined;
  const details = summary
    ? [
        { label: "期望节点", value: summary.desired ?? "-" },
        { label: "就绪节点", value: summary.ready ?? "-" },
        { label: "已更新节点", value: summary.updated ?? "-" },
        { label: "镜像", value: summary.images ?? "-" },
      ]
    : [];
  const hasEvents = types.data?.items.some(
    (item) =>
      item.type.group === "" &&
      item.type.version === "v1" &&
      item.type.resource === "events" &&
      item.actions.includes("list"),
  );

  const tabs: DetailTab[] =
    query.data && doc
      ? [
          { key: "configuration", title: "配置", content: <ResourceManifest value={query.data} /> },
          ...(hasEvents
            ? [{ key: "events", title: "事件", content: <ResourceEvents resource={doc} /> }]
            : []),
          {
            key: "related",
            title: "关联资源",
            content: <RelatedResources resource={doc} descriptors={types.data?.items ?? []} />,
          },
        ]
      : [];
  return (
    <DetailPageFrame
      title={resourceRef.name}
      status={summary?.status ? <StatusBadge {...summary.status} /> : undefined}
      breadcrumbs={[{ label: "守护进程集", onClick: onList }, { label: resourceRef.name }]}
      onBack={onBack}
      headerItems={[
        {
          label: "集群",
          value: <ResourceIdentity id={resourceRef.cluster_id} display="id" idLabel="集群 ID" />,
        },
        {
          label: "命名空间",
          value: <ResourceIdentity name={resourceRef.namespace} display="name" />,
        },
      ]}
      actions={
        <Button onClick={() => query.refetch()} loading={query.isFetching}>
          刷新
        </Button>
      }
      cards={[
        {
          key: "identity",
          title: "基本信息",
          content: <ResourceInfo resource={doc} details={details} />,
        },
      ]}
      tabs={tabs}
    />
  );
}
