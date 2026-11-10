import { useQuery } from "@tanstack/react-query";
import { getResource, listResourceTypes, type ClusterOpsResourceRef } from "@/api/cluster-ops";
import { clusterOpsKeys } from "@/api/cluster-ops/keys";
import {
  ToolbarIconButton,
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

interface DeploymentDetailPageProps {
  resourceRef: ClusterOpsResourceRef;
  onBack: () => void;
  onList: () => void;
}

export function DeploymentDetailPage({ resourceRef, onBack, onList }: DeploymentDetailPageProps) {
  const query = useQuery({
    queryKey: clusterOpsKeys.resource(resourceRef),
    queryFn: ({ signal }) => getResource(resourceRef, { signal }),
    meta: { errorNotification: { id: "cluster-resource", action: "读取部署详情" } },
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
        { label: "期望副本", value: summary.desired ?? "-" },
        { label: "就绪副本", value: summary.ready ?? "-" },
        { label: "已更新副本", value: summary.updated ?? "-" },
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
      loading={query.isLoading || types.isLoading}
      title={resourceRef.name}
      status={summary?.status ? <StatusBadge {...summary.status} /> : undefined}
      breadcrumbs={[{ label: "部署", onClick: onList }, { label: resourceRef.name }]}
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
        <ToolbarIconButton
          label="刷新"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
          spinning={query.isFetching}
        />
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
