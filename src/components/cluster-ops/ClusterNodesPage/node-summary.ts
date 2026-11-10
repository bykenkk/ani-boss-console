import type { ClusterOpsResourceDocument } from "@/api/cluster-ops";
import type { StatusBadgeTone } from "@/components/common";
import { array, field, nativeObject, record, text } from "../model";

const quantityScales: Record<string, number> = {
  "": 1,
  n: 1e-9,
  u: 1e-6,
  m: 1e-3,
  k: 1e3,
  K: 1e3,
  M: 1e6,
  G: 1e9,
  T: 1e12,
  P: 1e15,
  E: 1e18,
  Ki: 1024,
  Mi: 1024 ** 2,
  Gi: 1024 ** 3,
  Ti: 1024 ** 4,
  Pi: 1024 ** 5,
  Ei: 1024 ** 6,
};

function quantityValue(value: unknown): number | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const match = String(value).match(/^([+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)([a-zA-Z]*)$/);
  if (!match || !Object.hasOwn(quantityScales, match[2])) return undefined;
  const result = Number(match[1]) * quantityScales[match[2]];
  return Number.isFinite(result) ? result : undefined;
}

export function formatNodeQuantity(value: unknown, resource: "cpu" | "memory" | "pods"): string {
  const quantity = quantityValue(value);
  if (quantity === undefined) return "-";
  if (resource === "cpu") return `${Number(quantity.toFixed(9))} 核`;
  if (resource === "memory") return `${Number((quantity / 1024 ** 3).toFixed(2))} GiB`;
  return String(quantity);
}

export function nodeSummary(doc: ClusterOpsResourceDocument) {
  const object = nativeObject(doc);
  const conditions = array(field(object, "status", "conditions"));
  const ready = conditions.find((condition) => field(condition, "type") === "Ready");
  const readyStatus = field(ready, "status");
  const unschedulable = field(object, "spec", "unschedulable") === true;
  const unhealthy = conditions.filter(
    (condition) =>
      ["MemoryPressure", "DiskPressure", "PIDPressure", "NetworkUnavailable"].includes(
        text(field(condition, "type")),
      ) && field(condition, "status") === "True",
  );
  let status: { value: string; tone: StatusBadgeTone };
  if (field(object, "metadata", "deletionTimestamp")) status = { value: "删除中", tone: "warning" };
  else if (readyStatus === "False") status = { value: "未就绪", tone: "danger" };
  else if (readyStatus !== "True") status = { value: "状态未知", tone: "default" };
  else if (unhealthy.length) status = { value: "健康异常", tone: "warning" };
  else status = { value: "运行中", tone: "success" };

  const rolePrefix = "node-role.kubernetes.io/";
  const labels = record(field(object, "metadata", "labels"));
  const roles = Object.keys(labels)
    .filter((key) => key.startsWith(rolePrefix))
    .map((key) => key.slice(rolePrefix.length));
  if (typeof labels["kubernetes.io/role"] === "string") roles.push(labels["kubernetes.io/role"]);
  const roleLabels = roles.filter(Boolean).map((role) => {
    if (role === "control-plane" || role === "master") return "控制平面";
    if (role === "worker") return "工作节点";
    return role;
  });
  return {
    ...status,
    statusDescription: [...(ready ? [ready] : []), ...unhealthy]
      .map((condition) => text(field(condition, "message")))
      .join("\n"),
    unschedulable,
    taints: array(field(object, "spec", "taints")).map(
      (taint) =>
        `${text(field(taint, "key"))}${field(taint, "value") ? `=${text(field(taint, "value"))}` : ""}:${text(field(taint, "effect"))}`,
    ),
    internalIPs:
      array(field(object, "status", "addresses"))
        .filter((address) => field(address, "type") === "InternalIP")
        .map((address) => text(field(address, "address")))
        .join(", ") || "-",
    roles: [...new Set(roleLabels)].join(" / ") || "未标记",
    // Capacity 是节点总容量，不代表空闲量或实时用量。
    cpu: formatNodeQuantity(field(object, "status", "capacity", "cpu"), "cpu"),
    memory: formatNodeQuantity(field(object, "status", "capacity", "memory"), "memory"),
    kubeletVersion: text(field(object, "status", "nodeInfo", "kubeletVersion")),
    createdAt: text(field(object, "metadata", "creationTimestamp")),
  };
}
