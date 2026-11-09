import type { ClusterOpsListResourcesParams, ClusterOpsResourceRef } from "./types";
export const clusterOpsKeys = {
  all: ["cluster-ops"] as const,
  clusters: () => ["cluster-ops", "clusters"] as const,
  overview: (clusterId: string) => ["cluster-ops", "overview", clusterId] as const,
  resourceTypes: (clusterId: string) => ["cluster-ops", "types", clusterId] as const,
  resources: (clusterId: string, params: ClusterOpsListResourcesParams) =>
    ["cluster-ops", "resources", clusterId, params] as const,
  resource: (ref: ClusterOpsResourceRef, includeSecretData = false) =>
    ["cluster-ops", "resource", ref, includeSecretData] as const,
};
