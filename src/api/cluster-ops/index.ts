import { adminRequest, ApiError, toApiError } from "@/api/request";
import type {
  ClusterOpsListClustersResponse,
  ClusterOpsClusterOverview,
  ClusterOpsListResourceTypesResponse,
  ClusterOpsListResourcesParams,
  ClusterOpsListResourcesResponse,
  ClusterOpsResourceRef,
  ClusterOpsGetResourceResponse,
  ClusterOpsCreateInput,
  ClusterOpsMutationResponse,
  ClusterOpsUpdateInput,
  ClusterOpsDeleteInput,
  ClusterOpsDeleteResourceResponse,
  ClusterOpsScaleInput,
  ClusterOpsScaleWorkloadResponse,
  ClusterOpsRestartInput,
  ClusterOpsPodLogTarget,
  ClusterOpsPodLogOptions,
} from "./types";

export type * from "./types";
export { ApiError, getAuthSessionSignal, toApiError } from "@/api/request";
const segment = encodeURIComponent;
const clusterPath = (id: string) => `/cluster-ops/clusters/${segment(id)}`;
const resourcePath = (ref: ClusterOpsResourceRef) =>
  `${clusterPath(ref.cluster_id)}/resources/${segment(ref.name)}`;
const timeout = 40_000;
function writeResult<T>(request: Promise<T>): Promise<T> {
  return request.catch((value: unknown) => {
    const error = toApiError(value);
    if (!error.status || error.status === 504)
      throw new ApiError("结果尚未确认，请刷新资源查看；不会自动再次提交", {
        status: error.status,
        code: error.code,
        reason: error.reason,
        requestId: error.requestId,
        response: error.response,
        config: error.config,
        details: error.details,
        cause: error,
      });
    throw error;
  });
}

export function listClusters(signal?: AbortSignal): Promise<ClusterOpsListClustersResponse> {
  return adminRequest("/cluster-ops/clusters", { signal, timeout });
}
export function getClusterOverview(
  clusterId: string,
  signal?: AbortSignal,
): Promise<ClusterOpsClusterOverview> {
  return adminRequest(`${clusterPath(clusterId)}/overview`, { signal, timeout });
}
export function listResourceTypes(
  clusterId: string,
  signal?: AbortSignal,
): Promise<ClusterOpsListResourceTypesResponse> {
  return adminRequest(`${clusterPath(clusterId)}/resource-types`, { signal, timeout });
}
export function listResources(
  clusterId: string,
  params: ClusterOpsListResourcesParams,
  signal?: AbortSignal,
): Promise<ClusterOpsListResourcesResponse> {
  return adminRequest<ClusterOpsListResourcesResponse>(`${clusterPath(clusterId)}/resources`, {
    params,
    signal,
    timeout,
  }).catch((value: unknown) => {
    const error = toApiError(value);
    if (error.reason === "LIST_EXPIRED")
      throw new ApiError("列表快照已过期，请刷新", {
        status: error.status,
        reason: error.reason,
        code: error.code,
        requestId: error.requestId,
      });
    throw value;
  });
}
export function getResource(
  ref: ClusterOpsResourceRef,
  options?: { include_secret_data?: boolean; signal?: AbortSignal },
): Promise<ClusterOpsGetResourceResponse> {
  return adminRequest(resourcePath(ref), {
    params: {
      ...ref.type,
      namespace: ref.namespace,
      include_secret_data: options?.include_secret_data,
    },
    signal: options?.signal,
    timeout,
  });
}
export function createResource(
  clusterId: string,
  input: ClusterOpsCreateInput,
): Promise<ClusterOpsMutationResponse> {
  return writeResult(
    adminRequest(`${clusterPath(clusterId)}/resources`, {
      method: "POST",
      data: {
        data: {
          type: input.type,
          namespace: input.namespace,
          name: input.name,
          manifest_yaml: input.manifest_yaml,
          dry_run: input.dry_run,
        },
      },
      timeout,
    }),
  );
}
export function updateResource(
  ref: ClusterOpsResourceRef,
  input: ClusterOpsUpdateInput,
): Promise<ClusterOpsMutationResponse> {
  return writeResult(
    adminRequest(resourcePath(ref), {
      method: "PUT",
      data: {
        data: {
          type: ref.type,
          namespace: ref.namespace,
          manifest_yaml: input.manifest_yaml,
          expected_uid: input.expected_uid,
          expected_resource_version: input.expected_resource_version,
          dry_run: input.dry_run,
        },
      },
      timeout,
    }),
  );
}
export function deleteResource(
  ref: ClusterOpsResourceRef,
  input: ClusterOpsDeleteInput,
): Promise<ClusterOpsDeleteResourceResponse> {
  return writeResult(
    adminRequest(resourcePath(ref), {
      method: "DELETE",
      params: { ...ref.type, namespace: ref.namespace, expected_uid: input.expected_uid },
      timeout,
    }),
  );
}
export function scaleWorkload(
  ref: ClusterOpsResourceRef,
  input: ClusterOpsScaleInput,
): Promise<ClusterOpsScaleWorkloadResponse> {
  return writeResult(
    adminRequest(`${resourcePath(ref)}/scale`, {
      method: "POST",
      data: {
        data: {
          type: ref.type,
          namespace: ref.namespace,
          expected_uid: input.expected_uid,
          expected_resource_version: input.expected_resource_version,
          replicas: input.replicas,
          dry_run: input.dry_run,
        },
      },
      timeout,
    }),
  );
}
export function restartWorkload(
  ref: ClusterOpsResourceRef,
  input: ClusterOpsRestartInput,
): Promise<ClusterOpsMutationResponse> {
  return writeResult(
    adminRequest(`${resourcePath(ref)}/restart`, {
      method: "POST",
      data: {
        data: {
          type: ref.type,
          namespace: ref.namespace,
          expected_uid: input.expected_uid,
          expected_resource_version: input.expected_resource_version,
          dry_run: input.dry_run,
        },
      },
      timeout,
    }),
  );
}
export function streamPodLogs(
  target: ClusterOpsPodLogTarget,
  options: ClusterOpsPodLogOptions & { signal: AbortSignal },
): Promise<ReadableStream<Uint8Array>> {
  const { signal, ...params } = options;
  return adminRequest(
    `${clusterPath(target.cluster_id)}/namespaces/${segment(target.namespace)}/pods/${segment(target.pod_name)}/logs`,
    {
      params,
      signal,
      timeout: 0,
      adapter: "fetch",
      responseType: "stream",
      headers: { Accept: "text/event-stream" },
    },
  );
}
