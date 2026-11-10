import type { ClusterOpsResourceDocument } from "@/api/cluster-ops";
import type { StatusBadgeTone } from "@/components/common";
import { array, field, nativeObject, text } from "../model";
import { podStatus, podSummary } from "./pod-summary";
import { serviceSummary } from "./service-summary";

export interface WorkloadStatus {
  value: string;
  tone: StatusBadgeTone;
}

function workloadStatus(object: Record<string, unknown>, resource: string): WorkloadStatus {
  if (field(object, "metadata", "deletionTimestamp")) return { value: "删除中", tone: "warning" };
  if (resource === "pods") return podStatus(object);
  const conditions = array(field(object, "status", "conditions"));
  const hasCondition = (type: string) =>
    conditions.some(
      (condition) => field(condition, "type") === type && field(condition, "status") === "True",
    );
  if (resource === "jobs") {
    if (hasCondition("Complete")) return { value: "已完成", tone: "success" };
    if (hasCondition("Failed")) return { value: "失败", tone: "danger" };
    if (hasCondition("FailureTarget")) return { value: "失败收尾中", tone: "danger" };
    if (hasCondition("SuccessCriteriaMet")) return { value: "完成收尾中", tone: "info" };
    if (field(object, "spec", "suspend") === true || hasCondition("Suspended"))
      return { value: "已暂停", tone: "default" };
    if (Number(field(object, "status", "active") ?? 0) > 0)
      return { value: "运行中", tone: "info" };
    return { value: "等待执行", tone: "warning" };
  }
  if (field(object, "spec", "paused") === true) return { value: "已暂停", tone: "default" };
  const generation = field(object, "metadata", "generation");
  const observed = field(object, "status", "observedGeneration");
  if (typeof generation !== "number" || typeof observed !== "number" || observed < generation)
    return { value: "等待同步", tone: "warning" };
  if (resource === "daemonsets") {
    const desired = field(object, "status", "desiredNumberScheduled");
    if (typeof desired !== "number") return { value: "状态未知", tone: "default" };
    if (Number(field(object, "status", "numberMisscheduled") ?? 0) > 0)
      return { value: "调度异常", tone: "warning" };
    if (desired === 0) return { value: "无待调度节点", tone: "default" };
    return Number(field(object, "status", "numberReady") ?? 0) >= desired
      ? { value: "已就绪", tone: "success" }
      : { value: "未就绪", tone: "warning" };
  }
  if (
    conditions.some(
      (condition) =>
        field(condition, "type") === "Progressing" &&
        field(condition, "status") === "False" &&
        field(condition, "reason") === "ProgressDeadlineExceeded",
    )
  )
    return { value: "发布超时", tone: "danger" };
  const desired = field(object, "spec", "replicas");
  if (typeof desired !== "number") return { value: "状态未知", tone: "default" };
  const replicas = Number(field(object, "status", "replicas") ?? 0);
  if (desired === 0)
    return replicas === 0
      ? { value: "已缩容", tone: "default" }
      : { value: "缩容中", tone: "info" };
  if (Number(field(object, "status", "readyReplicas") ?? 0) >= desired)
    return { value: "已就绪", tone: "success" };
  return { value: "未就绪", tone: "warning" };
}

export function workloadSummary(doc: ClusterOpsResourceDocument) {
  const object = nativeObject(doc);
  const resource = doc.ref.type.resource;
  const daemonSet = resource === "daemonsets";
  return {
    status: resource === "services" ? undefined : workloadStatus(object, resource),
    ready: Number(field(object, "status", daemonSet ? "numberReady" : "readyReplicas") ?? 0),
    desired: daemonSet
      ? text(field(object, "status", "desiredNumberScheduled"))
      : text(field(object, "spec", "replicas")),
    updated: Number(
      field(object, "status", daemonSet ? "updatedNumberScheduled" : "updatedReplicas") ?? 0,
    ),
    active: Number(field(object, "status", "active") ?? 0),
    succeeded: Number(field(object, "status", "succeeded") ?? 0),
    failed: Number(field(object, "status", "failed") ?? 0),
    completions: text(field(object, "spec", "completions")),
    images: array(
      resource === "pods"
        ? field(object, "spec", "containers")
        : field(object, "spec", "template", "spec", "containers"),
    )
      .map((container) => text(field(container, "image")))
      .join(", "),
    createdAt: String(field(object, "metadata", "creationTimestamp") ?? ""),
    pod: resource === "pods" ? podSummary(object) : undefined,
    service: resource === "services" ? serviceSummary(object) : undefined,
  };
}
