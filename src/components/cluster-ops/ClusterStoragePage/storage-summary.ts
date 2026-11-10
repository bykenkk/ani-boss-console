import type { ClusterOpsResourceDocument } from "@/api/cluster-ops";
import type { StatusBadgeTone } from "@/components/common";
import { array, field, nativeObject, text } from "../model";

const phases: Record<string, { value: string; tone: StatusBadgeTone }> = {
  Pending: { value: "等待绑定", tone: "warning" },
  Available: { value: "可用", tone: "success" },
  Bound: { value: "已绑定", tone: "success" },
  Released: { value: "已释放", tone: "default" },
  Lost: { value: "丢失", tone: "danger" },
  Failed: { value: "失败", tone: "danger" },
};

export function storageSummary(doc: ClusterOpsResourceDocument) {
  const object = nativeObject(doc);
  const claim = doc.ref.type.resource === "persistentvolumeclaims";
  const phase = text(field(object, "status", "phase"));
  const policy = text(
    claim
      ? undefined
      : doc.ref.type.resource === "storageclasses"
        ? object.reclaimPolicy
        : field(object, "spec", "persistentVolumeReclaimPolicy"),
  );
  const binding = text(object.volumeBindingMode);
  const modeLabels: Record<string, string> = {
    ReadWriteOnce: "RWO",
    ReadOnlyMany: "ROX",
    ReadWriteMany: "RWX",
    ReadWriteOncePod: "RWOP",
  };
  const claimName = field(object, "spec", "claimRef", "name");
  const claimNamespace = field(object, "spec", "claimRef", "namespace");
  const defaultClass =
    field(object, "metadata", "annotations", "storageclass.kubernetes.io/is-default-class") ===
      "true" ||
    field(object, "metadata", "annotations", "storageclass.beta.kubernetes.io/is-default-class") ===
      "true";
  return {
    status: field(object, "metadata", "deletionTimestamp")
      ? { value: "删除中", tone: "warning" as const }
      : (phases[phase] ?? { value: phase, tone: "default" as const }),
    storageClass: text(field(object, "spec", "storageClassName")),
    capacity: text(field(object, claim ? "status" : "spec", "capacity", "storage")),
    requested: text(field(object, "spec", "resources", "requests", "storage")),
    accessModes: array(field(object, "spec", "accessModes"))
      .map((mode) => modeLabels[text(mode)] ?? text(mode))
      .join(", "),
    volume: text(field(object, "spec", "volumeName")),
    claim: claimName && claimNamespace ? `${text(claimNamespace)}/${text(claimName)}` : "-",
    reclaimPolicy:
      ({ Delete: "删除", Retain: "保留", Recycle: "回收" } as Record<string, string>)[policy] ??
      policy,
    provisioner: text(object.provisioner),
    bindingMode:
      ({ Immediate: "立即绑定", WaitForFirstConsumer: "等待首次使用者" } as Record<string, string>)[
        binding
      ] ?? binding,
    expansion: object.allowVolumeExpansion === true ? "允许" : "不允许",
    defaultClass: defaultClass ? "是" : "否",
    createdAt: String(field(object, "metadata", "creationTimestamp") ?? ""),
  };
}
