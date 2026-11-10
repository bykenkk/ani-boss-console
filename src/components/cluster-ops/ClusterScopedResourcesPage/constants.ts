import type { ClusterOpsResourceTypeRef } from "@/api/cluster-ops";

export const scopedResourceDefinitions = {
  namespaces: {
    title: "命名空间",
    subtitle: "集群命名空间的运行状态与标签信息",
    type: { group: "", version: "v1", resource: "namespaces" },
  },
  crds: {
    title: "自定义资源",
    subtitle: "集群 CRD 的 API 组、资源种类、作用域与服务版本",
    type: {
      group: "apiextensions.k8s.io",
      version: "v1",
      resource: "customresourcedefinitions",
    },
  },
} satisfies Record<string, { title: string; subtitle: string; type: ClusterOpsResourceTypeRef }>;

export type ClusterScopedResourceKind = keyof typeof scopedResourceDefinitions;
