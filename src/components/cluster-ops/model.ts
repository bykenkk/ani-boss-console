import type {
  ClusterOpsAction,
  ClusterOpsResourceDescriptor,
  ClusterOpsResourceDocument,
  ClusterOpsResourceTypeRef,
} from "@/api/cluster-ops";

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
