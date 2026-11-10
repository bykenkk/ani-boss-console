import type { ClusterOpsResourceTypeRef } from "@/api/cluster-ops";

export const configDefinitions = {
  secrets: {
    title: "保密字典",
    subtitle: "密码、令牌与密钥等保密配置的类型和字段信息",
    type: { group: "", version: "v1", resource: "secrets" },
  },
  configmaps: {
    title: "配置字典",
    subtitle: "应用环境变量、配置文件等非保密配置数据",
    type: { group: "", version: "v1", resource: "configmaps" },
  },
} satisfies Record<string, { title: string; subtitle: string; type: ClusterOpsResourceTypeRef }>;

export type ClusterConfigKind = keyof typeof configDefinitions;
