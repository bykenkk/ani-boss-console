import type { ClusterOpsResourceRef } from "@/api/cluster-ops";

export function resourceDetailDestination(ref: ClusterOpsResourceRef) {
  switch (`${ref.type.group}/${ref.type.version}/${ref.type.resource}`) {
    case "apps/v1/deployments":
      return {
        to: "/workload-deployments/$workloadName" as const,
        params: { workloadName: ref.name },
        search: { cluster_id: ref.cluster_id, namespace: ref.namespace },
      };
    case "apps/v1/statefulsets":
      return {
        to: "/workload-statefulsets/$workloadName" as const,
        params: { workloadName: ref.name },
        search: { cluster_id: ref.cluster_id, namespace: ref.namespace },
      };
    case "batch/v1/jobs":
      return {
        to: "/workload-jobs/$workloadName" as const,
        params: { workloadName: ref.name },
        search: { cluster_id: ref.cluster_id, namespace: ref.namespace },
      };
    case "/v1/pods":
      return {
        to: "/workload-pods/$workloadName" as const,
        params: { workloadName: ref.name },
        search: { cluster_id: ref.cluster_id, namespace: ref.namespace },
      };
    case "/v1/services":
      return {
        to: "/workload-services/$workloadName" as const,
        params: { workloadName: ref.name },
        search: { cluster_id: ref.cluster_id, namespace: ref.namespace },
      };
    case "apps/v1/daemonsets":
      return {
        to: "/workload-daemonsets/$workloadName" as const,
        params: { workloadName: ref.name },
        search: { cluster_id: ref.cluster_id, namespace: ref.namespace },
      };
    case "/v1/persistentvolumeclaims":
      return {
        to: "/storage-claims/$storageName" as const,
        params: { storageName: ref.name },
        search: { cluster_id: ref.cluster_id, namespace: ref.namespace },
      };
    case "/v1/persistentvolumes":
      return {
        to: "/storage-volumes/$storageName" as const,
        params: { storageName: ref.name },
        search: { cluster_id: ref.cluster_id },
      };
    case "storage.k8s.io/v1/storageclasses":
      return {
        to: "/storage-classes/$storageName" as const,
        params: { storageName: ref.name },
        search: { cluster_id: ref.cluster_id },
      };
    case "/v1/secrets":
      return {
        to: "/config-secrets/$configName" as const,
        params: { configName: ref.name },
        search: { cluster_id: ref.cluster_id, namespace: ref.namespace },
      };
    case "/v1/configmaps":
      return {
        to: "/config-maps/$configName" as const,
        params: { configName: ref.name },
        search: { cluster_id: ref.cluster_id, namespace: ref.namespace },
      };
    case "/v1/namespaces":
      return {
        to: "/cluster-namespaces/$namespaceName" as const,
        params: { namespaceName: ref.name },
        search: { cluster_id: ref.cluster_id },
      };
    case "apiextensions.k8s.io/v1/customresourcedefinitions":
      return {
        to: "/cluster-crds/$crdName" as const,
        params: { crdName: ref.name },
        search: { cluster_id: ref.cluster_id },
      };
    case "/v1/nodes":
      return {
        to: "/cluster-nodes/$nodeName" as const,
        params: { nodeName: ref.name },
        search: { cluster_id: ref.cluster_id },
      };
    default:
      return undefined;
  }
}
