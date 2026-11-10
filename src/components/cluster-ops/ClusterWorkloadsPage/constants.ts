import type { ClusterOpsResourceTypeRef } from "@/api/cluster-ops";

export const workloadDefinitions = {
  deployments: {
    title: "部署",
    subtitle: "无状态应用的副本与运行状态",
    type: { group: "apps", version: "v1", resource: "deployments" },
  },
  statefulsets: {
    title: "有状态副本集",
    subtitle: "有状态应用的副本与运行状态",
    type: { group: "apps", version: "v1", resource: "statefulsets" },
  },
  jobs: {
    title: "任务",
    subtitle: "一次性任务的执行状态与完成情况",
    type: { group: "batch", version: "v1", resource: "jobs" },
  },
  pods: {
    title: "容器组",
    subtitle: "容器组的运行状态、容器就绪情况与节点分布",
    type: { group: "", version: "v1", resource: "pods" },
  },
  services: {
    title: "服务",
    subtitle: "集群服务的访问类型、地址与端口",
    type: { group: "", version: "v1", resource: "services" },
  },
  daemonsets: {
    title: "守护进程集",
    subtitle: "节点守护容器组的调度与就绪情况",
    type: { group: "apps", version: "v1", resource: "daemonsets" },
  },
} satisfies Record<string, { title: string; subtitle: string; type: ClusterOpsResourceTypeRef }>;

export type ClusterWorkloadKind = keyof typeof workloadDefinitions;
