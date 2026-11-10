import { Button } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { getResource, listResourceTypes, type ClusterOpsResourceRef } from "@/api/cluster-ops";
import { clusterOpsKeys } from "@/api/cluster-ops/keys";
import { DetailPageFrame, type DetailTab } from "@/components/common";
import { ResourceInfo } from "../ResourceInfo";
import { ResourceEvents } from "../ResourceEvents";
import { RelatedResources } from "../RelatedResources";
import { ResourceManifest } from "../ResourceManifest";
import { workloadSummary } from "../ClusterWorkloadsPage/workload-summary";

interface ServiceDetailPageProps {
  resourceRef: ClusterOpsResourceRef;
  onBack: () => void;
  onList: () => void;
}

export function ServiceDetailPage({ resourceRef, onBack, onList }: ServiceDetailPageProps) {
  const query = useQuery({
    queryKey: clusterOpsKeys.resource(resourceRef),
    queryFn: ({ signal }) => getResource(resourceRef, { signal }),
    meta: { errorNotification: { id: "cluster-resource", action: "读取服务详情" } },
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
        { label: "服务类型", value: summary.service?.type ?? "-" },
        { label: "集群 IP", value: summary.service?.clusterIP ?? "-" },
        { label: "外部地址", value: summary.service?.externalAddress ?? "-" },
        { label: "端口", value: summary.service?.ports ?? "-" },
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

      breadcrumbs={[{ label: "服务", onClick: onList }, { label: resourceRef.name }]}
      onBack={onBack}
      headerItems={[
        { label: "集群", value: resourceRef.cluster_id },
        { label: "命名空间", value: resourceRef.namespace },
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
