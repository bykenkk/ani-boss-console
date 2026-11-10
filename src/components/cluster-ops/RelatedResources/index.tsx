import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@arco-design/web-react";
import {
  listResources,
  ApiError,
  type ClusterOpsResourceDescriptor,
  type ClusterOpsResourceDocument,
  type ClusterOpsResourceRef,
  type ClusterOpsResourceTypeRef,
} from "@/api/cluster-ops";
import { clusterOpsKeys } from "@/api/cluster-ops/keys";
import { DataTable, ResourceIdentity } from "@/components/common";
import { useCursorPagination } from "@/hooks/useCursorPagination";
import { array, field, labelSelector, nativeObject, record, resourceState } from "../model";
import { ResourceLink } from "./ResourceLink";

interface RelatedResourcesProps {
  resource: ClusterOpsResourceDocument;
  descriptors: ClusterOpsResourceDescriptor[];
}
interface MatchingResourcesProps {
  clusterId: string;
  namespace: string;
  type: ClusterOpsResourceTypeRef;
  selector: string;
  title?: string;
}
function MatchingResources({
  clusterId,
  namespace,
  type,
  selector,
  title,
}: MatchingResourcesProps) {
  const scope = JSON.stringify([clusterId, namespace, type, selector]);
  const [expiredScope, setExpiredScope] = useState<string>();
  const expired = expiredScope === scope;
  // TODO(pagination-migration): 当前关联资源按 page_size/continue_token 翻页；后端支持 page/pageSize 和 items/total 后改用 useListPagination。
  const paging = useCursorPagination(scope, 50);
  const params = {
    ...type,
    namespace,
    label_selector: selector,
    page_size: paging.limit,
    continue_token: paging.cursor,
  };
  const query = useQuery({
    queryKey: clusterOpsKeys.resources(clusterId, params),
    queryFn: ({ signal }) => listResources(clusterId, params, signal),
    enabled: !expired,
    meta: { errorNotification: { id: "cluster-related-resources", action: "读取关联资源" } },
  });
  if (query.error instanceof ApiError && query.error.reason === "LIST_EXPIRED" && !expired) {
    setExpiredScope(scope);
    paging.resetPagination();
  }
  return (
    <DataTable
      header={{
        title,
        extra: (
          <Button
            onClick={() => {
              setExpiredScope(undefined);
              paging.resetPagination();
              if (!paging.cursor && !expired) query.refetch();
            }}
          >
            刷新
          </Button>
        ),
      }}
      columns={[
        {
          title: "名称",
          width: 200,
          ellipsis: true,
          render: (_, doc) => (
            <ResourceLink resourceRef={doc.ref} label={doc.ref.name} id={doc.uid} />
          ),
        },
        { title: "状态", width: 120, render: (_, doc) => resourceState(doc) },
      ]}
      data={query.data?.items ?? []}
      rowKey="uid"
      loading={query.isFetching}
      pagination={{
        ...paging.getPagination(query.data?.next_continue_token, query.isFetching || expired),
        pageSizeOptions: [20, 50, 100, 200],
      }}
    />
  );
}
export function RelatedResources({ resource, descriptors }: RelatedResourcesProps) {
  const object = nativeObject(resource);
  const refs: { ref?: ClusterOpsResourceRef; label: string }[] = [];
  const add = (kind: string, name: unknown, apiVersion = "v1") => {
    if (typeof name !== "string" || !name) return;
    const type = descriptors.find(
      (entry) =>
        entry.kind === kind &&
        `${entry.type.group ? `${entry.type.group}/` : ""}${entry.type.version}` === apiVersion,
    );
    refs.push({
      label: `${kind} · ${name}`,
      ref: type
        ? {
            cluster_id: resource.ref.cluster_id,
            type: type.type,
            namespace: type.namespaced ? resource.ref.namespace : "",
            name,
          }
        : undefined,
    });
  };
  for (const owner of array(field(object, "metadata", "ownerReferences")))
    add(
      String(field(owner, "kind") ?? ""),
      field(owner, "name"),
      String(field(owner, "apiVersion") ?? ""),
    );
  if (resource.ref.type.group === "" && resource.ref.type.resource === "pods") {
    add("ServiceAccount", field(object, "spec", "serviceAccountName"));
    for (const secret of array(field(object, "spec", "imagePullSecrets")))
      add("Secret", field(secret, "name"));
    for (const volume of array(field(object, "spec", "volumes"))) {
      add("ConfigMap", field(volume, "configMap", "name"));
      add("Secret", field(volume, "secret", "secretName"));
      add("PersistentVolumeClaim", field(volume, "persistentVolumeClaim", "claimName"));
      for (const source of array(field(volume, "projected", "sources"))) {
        add("ConfigMap", field(source, "configMap", "name"));
        add("Secret", field(source, "secret", "name"));
      }
    }
    for (const container of ["containers", "initContainers", "ephemeralContainers"].flatMap((key) =>
      array(field(object, "spec", key)),
    )) {
      for (const source of array(field(container, "envFrom"))) {
        add("ConfigMap", field(source, "configMapRef", "name"));
        add("Secret", field(source, "secretRef", "name"));
      }
      for (const env of array(field(container, "env"))) {
        add("ConfigMap", field(env, "valueFrom", "configMapKeyRef", "name"));
        add("Secret", field(env, "valueFrom", "secretKeyRef", "name"));
      }
    }
  }
  let selector: string | undefined;
  if (
    (resource.ref.type.group === "apps" &&
      ["deployments", "statefulsets", "daemonsets"].includes(resource.ref.type.resource)) ||
    (resource.ref.type.group === "batch" && resource.ref.type.resource === "jobs")
  )
    selector = labelSelector(field(object, "spec", "selector"));
  const service = resource.ref.type.group === "" && resource.ref.type.resource === "services";
  if (service) {
    const labels = Object.entries(record(field(object, "spec", "selector")));
    selector = labels.length
      ? labels.map(([key, value]) => `${key}=${String(value)}`).join(",")
      : undefined;
  }
  const podType = descriptors.find(
    (entry) =>
      entry.type.group === "" &&
      entry.type.version === "v1" &&
      entry.type.resource === "pods" &&
      entry.actions.includes("list"),
  );
  const endpointType = descriptors.find(
    (entry) => entry.type.resource === "endpointslices" && entry.actions.includes("list"),
  );
  const unique = Array.from(new Map(refs.map((entry) => [entry.label, entry])).values());
  const showPods = Boolean(selector && podType);
  const showEndpoints = Boolean(service && endpointType);
  const showReferences = unique.length > 0 || (!showPods && !showEndpoints);
  const showTitles = Number(showReferences) + Number(showPods) + Number(showEndpoints) > 1;
  return (
    <div className="flex flex-col gap-5">
      {showReferences ? (
        <DataTable
          header={showTitles ? { title: "引用资源" } : undefined}
          data={unique}
          rowKey="label"
          columns={[
            {
              title: "资源",
              width: 200,
              ellipsis: true,
              render: (_, entry) =>
                entry.ref ? (
                  <ResourceLink resourceRef={entry.ref} label={entry.label} />
                ) : (
                  <ResourceIdentity name={entry.label} display="name" />
                ),
            },
          ]}
          pagination={false}
        />
      ) : null}
      {selector && podType ? (
        <MatchingResources
          clusterId={resource.ref.cluster_id}
          namespace={resource.ref.namespace}
          type={podType.type}
          selector={selector}
          title={showTitles ? "容器组" : undefined}
        />
      ) : null}
      {service && endpointType ? (
        <MatchingResources
          clusterId={resource.ref.cluster_id}
          namespace={resource.ref.namespace}
          type={endpointType.type}
          selector={`kubernetes.io/service-name=${resource.ref.name}`}
          title={showTitles ? "服务端点" : undefined}
        />
      ) : null}
    </div>
  );
}
