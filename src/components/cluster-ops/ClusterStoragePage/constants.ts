import type { ClusterOpsResourceTypeRef } from "@/api/cluster-ops";

export const storageDefinitions = {
  claims: {
    title: "持久卷声明",
    subtitle: "持久化存储的容量申请、绑定状态与访问模式",
    namespaced: true,
    type: { group: "", version: "v1", resource: "persistentvolumeclaims" },
  },
  volumes: {
    title: "持久卷",
    subtitle: "集群持久卷的容量、绑定关系与回收策略",
    namespaced: false,
    type: { group: "", version: "v1", resource: "persistentvolumes" },
  },
  classes: {
    title: "存储类",
    subtitle: "存储供应者、卷绑定模式与容量扩展设置",
    namespaced: false,
    type: { group: "storage.k8s.io", version: "v1", resource: "storageclasses" },
  },
} satisfies Record<
  string,
  { title: string; subtitle: string; namespaced: boolean; type: ClusterOpsResourceTypeRef }
>;

export type ClusterStorageKind = keyof typeof storageDefinitions;
