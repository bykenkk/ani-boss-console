import type {
  ClusterOpsAction,
  ClusterOpsResourceDescriptor,
  ClusterOpsResourceDocument,
  ClusterOpsResourceRef,
  ClusterOpsResourceTypeRef,
} from "@/api/cluster-ops";
import { formatDateTime } from "@/lib/date";

const writeActions: ClusterOpsAction[] = ["create", "update", "delete", "scale", "restart"];
export function canResourceAction(
  descriptor: ClusterOpsResourceDescriptor,
  doc: ClusterOpsResourceDocument,
  action: ClusterOpsAction,
): boolean {
  return descriptor.actions.includes(action) && (!writeActions.includes(action) || !doc.read_only);
}
export function readOnlyMessage(reason: string): string {
  return (
    (
      {
        TENANT_NAMESPACE_READ_ONLY: "租户命名空间资源，本入口只读",
        NAMESPACE_POLICY_UNAVAILABLE: "租户命名空间登记暂不可用，写操作暂不可用",
        RESOURCE_READ_ONLY: "本期仅支持查看该类型",
      } as Record<string, string>
    )[reason] ?? (reason ? `当前资源只读（${reason}）` : "")
  );
}
export function resourceDetailSearch(ref: ClusterOpsResourceRef): Record<string, string> & {
  cluster_id: string;
  group: string;
  version: string;
  resource: string;
  namespace: string;
  name: string;
} {
  return { cluster_id: ref.cluster_id, ...ref.type, namespace: ref.namespace, name: ref.name };
}
export function sameResourceType(
  a: ClusterOpsResourceTypeRef,
  b: ClusterOpsResourceTypeRef,
): boolean {
  return a.group === b.group && a.version === b.version && a.resource === b.resource;
}
export function typeKey(type: ClusterOpsResourceTypeRef): string {
  return JSON.stringify([type.group, type.version, type.resource]);
}
export function nativeObject(doc: ClusterOpsResourceDocument): Record<string, unknown> {
  // Only display summaries and direct references use parsed JSON. Writes always use manifest_yaml.
  try {
    const value: unknown = JSON.parse(doc.object_json);
    return record(value);
  } catch {
    return {};
  }
}
export function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
export function field(value: unknown, ...path: string[]): unknown {
  return path.reduce<unknown>((current, key) => record(current)[key], value);
}
export function text(value: unknown): string {
  return value === null || value === undefined
    ? "-"
    : typeof value === "object"
      ? "-"
      : String(value);
}
export function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
function hasKnownSummary(type: ClusterOpsResourceTypeRef): boolean {
  if (type.version !== "v1") return false;
  if (type.group === "")
    return ["pods", "nodes", "persistentvolumes", "persistentvolumeclaims"].includes(type.resource);
  if (type.group === "apps")
    return ["deployments", "statefulsets", "daemonsets"].includes(type.resource);
  return type.group === "batch" && ["jobs", "cronjobs"].includes(type.resource);
}
export function resourceState(doc: ClusterOpsResourceDocument): string {
  const object = nativeObject(doc);
  if (field(object, "metadata", "deletionTimestamp")) return "Terminating";
  if (!hasKnownSummary(doc.ref.type)) return "查看原生对象";
  const resource = doc.ref.type.resource;
  if (["pods", "persistentvolumes", "persistentvolumeclaims"].includes(resource))
    return text(field(object, "status", "phase"));
  if (["deployments", "statefulsets"].includes(resource))
    return `期望 ${text(field(object, "spec", "replicas"))} / 就绪 ${text(field(object, "status", "readyReplicas"))}`;
  if (resource === "daemonsets")
    return `调度 ${text(field(object, "status", "desiredNumberScheduled"))} / 就绪 ${text(field(object, "status", "numberReady"))}`;
  if (resource === "jobs")
    return `运行 ${text(field(object, "status", "active"))} / 成功 ${text(field(object, "status", "succeeded"))} / 失败 ${text(field(object, "status", "failed"))}`;
  if (resource === "cronjobs")
    return `${text(field(object, "spec", "schedule"))}${field(object, "spec", "suspend") === true ? "（暂停）" : ""}`;
  if (resource === "nodes")
    return array(field(object, "status", "conditions")).find(
      (condition) => field(condition, "type") === "Ready",
    )
      ? text(
          field(
            array(field(object, "status", "conditions")).find(
              (condition) => field(condition, "type") === "Ready",
            ),
            "status",
          ),
        )
      : "-";
  return "查看原生对象";
}
const categories: Record<string, string[]> = {
  集群: ["nodes", "namespaces"],
  工作负载: [
    "pods",
    "deployments",
    "statefulsets",
    "daemonsets",
    "jobs",
    "cronjobs",
    "replicasets",
    "controllerrevisions",
  ],
  配置: ["configmaps", "secrets"],
  服务入口: ["services", "ingresses", "endpointslices"],
  存储: ["persistentvolumeclaims", "persistentvolumes", "storageclasses"],
  Kubernetes权限: [
    "serviceaccounts",
    "roles",
    "rolebindings",
    "clusterroles",
    "clusterrolebindings",
  ],
  事件: ["events"],
};
export function resourceCategory(descriptor: ClusterOpsResourceDescriptor): string {
  return (
    Object.entries(categories).find(
      ([, resources]) =>
        !descriptor.custom_resource && resources.includes(descriptor.type.resource),
    )?.[0] ?? "扩展资源"
  );
}
export function descriptorLabel(descriptor: ClusterOpsResourceDescriptor): string {
  return `${resourceCategory(descriptor)} · ${descriptor.kind} (${descriptor.type.group || "core"}/${descriptor.type.version})`;
}
export function labelSelector(value: unknown): string | undefined {
  const selector = record(value);
  const labels = Object.entries(record(selector.matchLabels)).map(
    ([key, val]) => `${key}=${String(val)}`,
  );
  for (const expression of array(selector.matchExpressions)) {
    const key = field(expression, "key"),
      operator = field(expression, "operator"),
      values = array(field(expression, "values"));
    if (typeof key !== "string") return undefined;
    if (operator === "In" || operator === "NotIn")
      labels.push(`${key} ${operator === "In" ? "in" : "notin"} (${values.join(",")})`);
    else if (operator === "Exists") labels.push(key);
    else if (operator === "DoesNotExist") labels.push(`!${key}`);
    else return undefined;
  }
  return labels.length ? labels.join(",") : undefined;
}

export function resourceFacts(doc: ClusterOpsResourceDocument): { label: string; value: string }[] {
  if (!hasKnownSummary(doc.ref.type)) return [];
  const object = nativeObject(doc);
  const fact = (label: string, ...path: string[]) => ({
    label,
    value: text(field(object, ...path)),
  });
  switch (doc.ref.type.resource) {
    case "pods": {
      const containers = array(field(object, "status", "containerStatuses"));
      const restarts = containers.reduce<number>(
        (sum, container) =>
          sum +
          (typeof field(container, "restartCount") === "number"
            ? Number(field(container, "restartCount"))
            : 0),
        0,
      );
      return [
        fact("Phase", "status", "phase"),
        {
          label: "普通容器 Ready",
          value: `${containers.filter((container) => field(container, "ready") === true).length}/${containers.length}`,
        },
        { label: "重启次数", value: String(restarts) },
        fact("节点", "spec", "nodeName"),
        fact("Pod IP", "status", "podIP"),
      ];
    }
    case "deployments":
    case "statefulsets":
      return [
        fact("期望副本", "spec", "replicas"),
        fact("观察副本", "status", "replicas"),
        fact("Ready 副本", "status", "readyReplicas"),
        fact("已更新副本", "status", "updatedReplicas"),
      ];
    case "daemonsets":
      return [
        fact("期望调度", "status", "desiredNumberScheduled"),
        fact("当前调度", "status", "currentNumberScheduled"),
        fact("Ready", "status", "numberReady"),
      ];
    case "jobs":
      return [
        fact("Active", "status", "active"),
        fact("Succeeded", "status", "succeeded"),
        fact("Failed", "status", "failed"),
        {
          label: "Conditions",
          value:
            array(field(object, "status", "conditions"))
              .map(
                (condition) =>
                  `${text(field(condition, "type"))}=${text(field(condition, "status"))}`,
              )
              .join(", ") || "-",
        },
      ];
    case "cronjobs":
      return [
        fact("计划", "spec", "schedule"),
        fact("暂停", "spec", "suspend"),
        {
          label: "最后调度时间",
          value: formatDateTime(String(field(object, "status", "lastScheduleTime") ?? "")),
        },
      ];
    case "nodes":
      return [
        {
          label: "Ready",
          value: text(
            field(
              array(field(object, "status", "conditions")).find(
                (condition) => field(condition, "type") === "Ready",
              ),
              "status",
            ),
          ),
        },
        fact("不可调度", "spec", "unschedulable"),
        { label: "Capacity", value: JSON.stringify(record(field(object, "status", "capacity"))) },
        {
          label: "Allocatable",
          value: JSON.stringify(record(field(object, "status", "allocatable"))),
        },
      ];
    case "persistentvolumeclaims":
      return [
        fact("Phase", "status", "phase"),
        fact("容量", "status", "capacity", "storage"),
        fact("请求容量", "spec", "resources", "requests", "storage"),
        fact("绑定 PV", "spec", "volumeName"),
      ];
    case "persistentvolumes":
      return [
        fact("Phase", "status", "phase"),
        fact("容量", "spec", "capacity", "storage"),
        fact("绑定 Namespace", "spec", "claimRef", "namespace"),
        fact("绑定 PVC", "spec", "claimRef", "name"),
      ];
    default:
      return [];
  }
}
