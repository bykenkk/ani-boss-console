import { Button, Descriptions } from "@arco-design/web-react";
import { IconRefresh } from "@arco-design/web-react/icon";
import { useQuery } from "@tanstack/react-query";
import { getResource, listResourceTypes, type ClusterOpsResourceRef } from "@/api/cluster-ops";
import { clusterOpsKeys } from "@/api/cluster-ops/keys";
import { ResourceIdentity, DetailPageFrame, type DetailTab } from "@/components/common";
import { formatDateTime } from "@/lib/date";
import { field, nativeObject, text } from "../model";
import { nodeSummary, formatNodeQuantity } from "../ClusterNodesPage/node-summary";
import { ResourceEvents } from "../ResourceEvents";
import { ResourceManifest } from "../ResourceManifest";
import { NodeHealth } from "./NodeHealth";
import { NodeMetadata } from "./NodeMetadata";
import { NodeStatus } from "../NodeStatus";

interface ClusterNodeDetailPageProps {
  resourceRef: ClusterOpsResourceRef;
  onBack: () => void;
  onList: () => void;
}

export function ClusterNodeDetailPage({ resourceRef, onBack, onList }: ClusterNodeDetailPageProps) {
  const query = useQuery({
    queryKey: clusterOpsKeys.resource(resourceRef),
    queryFn: ({ signal }) => getResource(resourceRef, { signal }),
    meta: { errorNotification: { id: "cluster-resource", action: "读取资源详情" } },
  });
  const types = useQuery({
    queryKey: clusterOpsKeys.resourceTypes(resourceRef.cluster_id),
    queryFn: ({ signal }) => listResourceTypes(resourceRef.cluster_id, signal),
    meta: { errorNotification: { id: "cluster-resource-types", action: "发现资源类型" } },
  });
  const doc = query.data?.resource;
  const summary = doc ? nodeSummary(doc) : undefined;
  const object = doc ? nativeObject(doc) : {};
  const nodeInfo = (key: string) => text(field(object, "status", "nodeInfo", key)) || "-";
  const allocatable = (resource: "cpu" | "memory" | "pods") =>
    formatNodeQuantity(field(object, "status", "allocatable", resource), resource);
  const tabs: DetailTab[] =
    query.data && doc
      ? [
          { key: "health", title: "健康状态", content: <NodeHealth resource={doc} /> },
          { key: "metadata", title: "元数据", content: <NodeMetadata resource={doc} /> },
          { key: "manifest", title: "配置", content: <ResourceManifest value={query.data} /> },
          ...(types.data?.items.some(
            (item) =>
              item.type.group === "" &&
              item.type.resource === "events" &&
              item.actions.includes("list"),
          )
            ? [{ key: "events", title: "事件", content: <ResourceEvents resource={doc} /> }]
            : []),
        ]
      : [];
  return (
    <DetailPageFrame
      loading={query.isLoading || types.isLoading}
      title={resourceRef.name}
      status={summary ? <NodeStatus summary={summary} /> : undefined}
      breadcrumbs={[{ label: "节点管理", onClick: onList }, { label: resourceRef.name }]}
      onBack={onBack}
      headerItems={[
        { label: "内网 IP", value: summary?.internalIPs ?? "-" },
        { label: "角色", value: summary?.roles ?? "-" },
      ]}
      actions={
        <Button
          aria-label="刷新"
          title="刷新"
          icon={<IconRefresh />}
          loading={query.isFetching}
          onClick={() => query.refetch()}
        />
      }
      defaultTabKey="health"
      cards={[
        {
          key: "identity",
          title: "基本信息",
          content: (
            <Descriptions
              column={1}
              data={[
                {
                  label: "集群",
                  value: (
                    <ResourceIdentity id={resourceRef.cluster_id} display="id" idLabel="集群 ID" />
                  ),
                },
                { label: "创建时间", value: formatDateTime(summary?.createdAt) },
              ]}
            />
          ),
        },
        {
          key: "capacity",
          title: "资源容量",
          content: (
            <div className="flex flex-col gap-3">
              <Descriptions
                column={1}
                data={[
                  { label: "CPU 总容量", value: summary?.cpu ?? "-" },
                  { label: "CPU 可分配", value: allocatable("cpu") },
                  { label: "内存总容量", value: summary?.memory ?? "-" },
                  { label: "内存可分配", value: allocatable("memory") },
                  { label: "Pod 容量", value: allocatable("pods") },
                ]}
              />
              <p className="m-0 text-xs leading-5 text-(--color-text-3)">
                可分配容量已扣除系统预留，不代表剩余容量或实时用量。
              </p>
            </div>
          ),
        },
        {
          key: "system",
          title: "系统信息",
          content: (
            <Descriptions
              column={1}
              data={[
                { label: "操作系统", value: nodeInfo("osImage") },
                { label: "系统类型", value: nodeInfo("operatingSystem") },
                { label: "CPU 架构", value: nodeInfo("architecture") },
                { label: "内核版本", value: nodeInfo("kernelVersion") },
                { label: "容器运行时", value: nodeInfo("containerRuntimeVersion") },
                { label: "Kubelet 版本", value: nodeInfo("kubeletVersion") },
                { label: "Kube-proxy 版本", value: nodeInfo("kubeProxyVersion") },
              ]}
            />
          ),
        },
      ]}
      tabs={tabs}
    />
  );
}
