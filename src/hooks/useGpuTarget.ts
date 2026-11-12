import { useQuery } from "@tanstack/react-query";
import { currentUserQueryKey, fetchCurrentUser } from "@/api/auth";
import { adminRequest } from "@/api/request";
import { getGpuClusterTarget, type GpuCluster } from "@/api/accelerator";
import { gpuScopeKey, type GpuOperationScope } from "@/api/accelerator/scope";

export function useGpuPermissions() {
  const me = useQuery({
    queryKey: currentUserQueryKey,
    queryFn: ({ signal }) => fetchCurrentUser(signal),
  });
  const principal = me.data?.id === undefined ? "" : String(me.data.id);
  const permissions = useQuery({
    queryKey: ["auth", "permission-codes", principal],
    queryFn: ({ signal }) => adminRequest<{ codes?: string[] }>("/perm-codes", { signal }),
    enabled: Boolean(principal),
  });
  const can = (code: string) =>
    permissions.isSuccess && Boolean(permissions.data?.codes?.includes(code));
  return { principal, can, permissions, me };
}
export function useGpuTarget() {
  const access = useGpuPermissions();
  const target = useQuery({
    queryKey: ["accelerator", "cluster-target", access.principal],
    queryFn: ({ signal }) => getGpuClusterTarget(signal),
    enabled: Boolean(access.principal) && access.can("accelerator:cluster:list"),
  });
  return { ...access, target };
}
export function useGpuOperationScope(cluster: Pick<GpuCluster, "connection_ref" | "cluster_id">) {
  const { principal } = useGpuPermissions();
  const scope: GpuOperationScope = {
    principal,
    connection_ref: cluster.connection_ref,
    cluster_id: cluster.cluster_id,
  };
  return { scope, scopeKey: gpuScopeKey(scope) };
}

export function useGpuCatalogScope(clusterId?: string) {
  const access = useGpuTarget();
  const scope: GpuOperationScope = {
    principal: access.principal,
    connection_ref:
      !clusterId || clusterId === access.target.data?.cluster_id
        ? (access.target.data?.connection_ref ?? "")
        : "",
    cluster_id: clusterId ?? access.target.data?.cluster_id ?? "",
  };
  return { ...access, scope, scopeKey: gpuScopeKey(scope) };
}
