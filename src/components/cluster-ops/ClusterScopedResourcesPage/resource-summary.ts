import type { ClusterOpsResourceDocument } from "@/api/cluster-ops";
import type { StatusBadgeTone } from "@/components/common";
import { array, field, nativeObject, record, text } from "../model";

interface ResourceStatus {
  value: string;
  tone: StatusBadgeTone;
}

function namespaceStatus(object: Record<string, unknown>): ResourceStatus {
  const phase = text(field(object, "status", "phase"));
  if (field(object, "metadata", "deletionTimestamp") || phase === "Terminating")
    return { value: "终止中", tone: "warning" };
  if (phase === "Active") return { value: "活跃", tone: "success" };
  return { value: phase, tone: "default" };
}

function crdStatus(object: Record<string, unknown>): ResourceStatus {
  const conditions = array(field(object, "status", "conditions"));
  const conditionStatus = (type: string) =>
    field(
      conditions.find((condition) => field(condition, "type") === type),
      "status",
    );
  if (field(object, "metadata", "deletionTimestamp") || conditionStatus("Terminating") === "True")
    return { value: "终止中", tone: "warning" };
  if (conditionStatus("NamesAccepted") === "False") return { value: "名称冲突", tone: "danger" };
  if (conditionStatus("Established") === "True") return { value: "已建立", tone: "success" };
  if (conditionStatus("Established") === "False") return { value: "未建立", tone: "warning" };
  return { value: "未知", tone: "default" };
}

export function scopedResourceSummary(doc: ClusterOpsResourceDocument) {
  const object = nativeObject(doc);
  const namespace = doc.ref.type.group === "" && doc.ref.type.resource === "namespaces";
  const versions = array(field(object, "spec", "versions"));
  const scope = text(field(object, "spec", "scope"));
  return {
    status: namespace ? namespaceStatus(object) : crdStatus(object),
    labels:
      Object.entries(record(field(object, "metadata", "labels")))
        .map(([key, value]) => `${key}=${text(value)}`)
        .join(", ") || "-",
    group: text(field(object, "spec", "group")),
    kind: text(field(object, "spec", "names", "kind")),
    scope: ({ Cluster: "集群", Namespaced: "命名空间" } as Record<string, string>)[scope] ?? scope,
    servedVersions:
      versions
        .filter((version) => field(version, "served") === true)
        .map((version) => text(field(version, "name")))
        .join(", ") || "-",
    storageVersion:
      versions
        .filter((version) => field(version, "storage") === true)
        .map((version) => text(field(version, "name")))
        .join(", ") || "-",
    createdAt: String(field(object, "metadata", "creationTimestamp") ?? ""),
  };
}
