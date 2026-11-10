import { useQuery } from "@tanstack/react-query";
import { getResource, listResourceTypes, type ClusterOpsResourceRef } from "@/api/cluster-ops";
import { clusterOpsKeys } from "@/api/cluster-ops/keys";
import {
  ToolbarIconButton,
  ResourceIdentity,
  DetailPageFrame,
  type DetailTab,
} from "@/components/common";
import { ResourceInfo } from "../ResourceInfo";
import { ResourceEvents } from "../ResourceEvents";
import { RelatedResources } from "../RelatedResources";
import { SecretConfiguration } from "./SecretConfiguration";
import { configSummary } from "../ClusterConfigPage/config-summary";

interface SecretDetailPageProps {
  resourceRef: ClusterOpsResourceRef;
  onBack: () => void;
  onList: () => void;
}

export function SecretDetailPage({ resourceRef, onBack, onList }: SecretDetailPageProps) {
  const query = useQuery({
    queryKey: clusterOpsKeys.resource(resourceRef),
    queryFn: ({ signal }) => getResource(resourceRef, { signal }),
    meta: { errorNotification: { id: "cluster-resource", action: "读取保密字典详情" } },
  });
  const types = useQuery({
    queryKey: clusterOpsKeys.resourceTypes(resourceRef.cluster_id),
    queryFn: ({ signal }) => listResourceTypes(resourceRef.cluster_id, signal),
    meta: { errorNotification: { id: "cluster-resource-types", action: "发现资源类型" } },
  });
  const doc = query.data?.resource;
  const summary = doc ? configSummary(doc) : undefined;
  const details = summary
    ? [
        { label: "类型", value: summary.type ?? "-" },
        { label: "字段数量", value: summary.keyCount ?? "-" },
        { label: "字段", value: summary.keyNames ?? "-" },
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
          {
            key: "configuration",
            title: "配置",
            content: <SecretConfiguration value={query.data} />,
          },
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

      breadcrumbs={[{ label: "保密字典", onClick: onList }, { label: resourceRef.name }]}
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
