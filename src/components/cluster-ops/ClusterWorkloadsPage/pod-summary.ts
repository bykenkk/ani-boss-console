import { array, field, text } from "../model";
import type { WorkloadStatus } from "./workload-summary";

export function podStatus(object: Record<string, unknown>): WorkloadStatus {
  const phase = field(object, "status", "phase");
  if (phase === "Succeeded") return { value: "已完成", tone: "success" };
  if (phase === "Failed") return { value: "失败", tone: "danger" };
  if (phase === "Unknown") return { value: "状态未知", tone: "default" };
  const statuses = [
    ...array(field(object, "status", "initContainerStatuses")),
    ...array(field(object, "status", "containerStatuses")),
  ];
  const failures: Record<string, string> = {
    CrashLoopBackOff: "反复重启",
    ImagePullBackOff: "镜像拉取失败",
    ErrImagePull: "镜像拉取失败",
    InvalidImageName: "镜像名称无效",
    CreateContainerConfigError: "容器配置错误",
    CreateContainerError: "容器创建失败",
    RunContainerError: "容器运行失败",
  };
  for (const status of statuses) {
    const reason = text(field(status, "state", "waiting", "reason"));
    if (failures[reason]) return { value: failures[reason], tone: "danger" };
  }
  const conditions = array(field(object, "status", "conditions"));
  if (phase === "Running") {
    const ready = conditions.some(
      (condition) => field(condition, "type") === "Ready" && field(condition, "status") === "True",
    );
    return ready ? { value: "运行中", tone: "success" } : { value: "未就绪", tone: "warning" };
  }
  if (phase === "Pending") {
    const unscheduled = conditions.some(
      (condition) =>
        field(condition, "type") === "PodScheduled" && field(condition, "status") === "False",
    );
    return { value: unscheduled ? "等待调度" : "准备中", tone: "warning" };
  }
  return { value: "状态未知", tone: "default" };
}

export function podSummary(object: Record<string, unknown>) {
  const containers = array(field(object, "status", "containerStatuses"));
  const statuses = [...array(field(object, "status", "initContainerStatuses")), ...containers];
  return {
    ready: `${containers.filter((container) => field(container, "ready") === true).length} / ${array(field(object, "spec", "containers")).length}`,
    restarts: statuses.reduce<number>(
      (sum, container) => sum + Number(field(container, "restartCount") ?? 0),
      0,
    ),
    node: text(field(object, "spec", "nodeName")),
    ip: text(field(object, "status", "podIP")),
  };
}
