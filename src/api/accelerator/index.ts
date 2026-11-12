import { requireGpuScope, type GpuOperationScope } from "./scope";
import { adminRequest } from "@/api/request";
import { runIdempotentRequest } from "@/api/idempotency";
import { createIdempotencyScope } from "@/lib/idempotency";
import type {
  AdoptGpuSupplyInput,
  CreateGpuPoolInput,
  CreateGpuProfileInput,
  DeleteGpuProfileInput,
  GpuCluster,
  GpuClusterTarget,
  GpuDevice,
  GpuPage,
  GpuPageParams,
  GpuPool,
  GpuProfile,
  GpuProfileCapacity,
  GpuProfilePreview,
  GpuSupplyGroup,
  GpuSupplyGroupCapacity,
  RegisterGpuClusterInput,
  SetGpuAdmissionInput,
  SetGpuProfileStateInput,
} from "./types";
export * from "./types";
export * from "./initialization";
export * from "./supply";
export * from "./types-supply";
export * from "./volcano-queues";
export * from "./group-policy";
export * from "./types-group-policy";

export function getGpuClusterTarget(signal?: AbortSignal): Promise<GpuClusterTarget> {
  return adminRequest("/accelerator/cluster-target", { signal });
}
export const acceleratorKeys = { all: ["accelerator"] as const };
const registerScope = createIdempotencyScope("gpu-cluster-register", ["POST"]);
const poolScope = createIdempotencyScope("gpu-pool-create", ["POST"]);
const adoptScope = createIdempotencyScope("gpu-supply-adopt", ["POST"]);
const admissionScope = createIdempotencyScope("gpu-admission-set", ["POST"]);
const profileScope = createIdempotencyScope("gpu-profile-create", ["POST"]);
const stateScope = createIdempotencyScope("gpu-profile-state", ["POST"]);
const deleteScope = createIdempotencyScope("gpu-profile-delete", ["POST"]);

// TODO(pagination-migration): 后端支持 page/pageSize 和 items/total 后，切换公共页码分页并复核筛选。
export function listGpuClusters(
  params: GpuPageParams,
  signal?: AbortSignal,
): Promise<GpuPage<GpuCluster>> {
  return adminRequest("/accelerator/clusters", { params, signal });
}
// TODO(pagination-migration): 后端支持 page/pageSize 和 items/total 后，切换公共页码分页并复核筛选。
export function listGpuPools(
  params: GpuPageParams & { cluster_id: string },
  signal?: AbortSignal,
): Promise<GpuPage<GpuPool>> {
  return adminRequest("/accelerator/pools", { params, signal });
}
// TODO(pagination-migration): 后端支持 page/pageSize 和 items/total 后，切换公共页码分页并复核筛选。
export function listGpuSupplyGroups(
  params: GpuPageParams & { cluster_id: string; pool_id: string },
  signal?: AbortSignal,
): Promise<GpuPage<GpuSupplyGroup>> {
  return adminRequest("/accelerator/supply-groups", { params, signal });
}
// 管理列表实际仅转发 cluster_id，不接受 group/mode/state 的前端补偿筛选。
// TODO(pagination-migration): 后端支持 page/pageSize 和 items/total 后，切换公共页码分页并复核筛选。
export function listGpuProfiles(
  params: GpuPageParams & { cluster_id: string },
  signal?: AbortSignal,
): Promise<GpuPage<GpuProfile>> {
  return adminRequest("/accelerator/profiles", { params, signal });
}
// TODO(pagination-migration): 后端支持 page/pageSize 和 items/total 后，切换公共页码分页并复核筛选。
export function listGpuDevices(
  params: GpuPageParams & { cluster_id: string; group_id?: string },
  signal?: AbortSignal,
): Promise<GpuPage<GpuDevice>> {
  return adminRequest("/accelerator/devices", { params, signal });
}
export function getGpuProfileCapacity(
  profile: Pick<GpuProfile, "profile_id" | "profile_version">,
  signal?: AbortSignal,
  includeDetails = false,
): Promise<GpuProfileCapacity> {
  return adminRequest(`/accelerator/profiles/${encodeURIComponent(profile.profile_id)}/capacity`, {
    params: { profile_version: profile.profile_version, include_details: includeDetails },
    signal,
  });
}
export function getGpuSupplyGroupCapacity(
  groupId: string,
  signal?: AbortSignal,
  includeDetails = false,
): Promise<GpuSupplyGroupCapacity> {
  return adminRequest(`/accelerator/supply-groups/${encodeURIComponent(groupId)}/capacity`, {
    params: { include_details: includeDetails },
    signal,
  });
}
export function previewGpuProfile(
  group_id: string,
  parts: number,
  signal?: AbortSignal,
): Promise<GpuProfilePreview> {
  return adminRequest("/accelerator/profiles:preview", { params: { group_id, parts }, signal });
}
// TODO(request-migration): 后端移除 data 包装后，同步调整请求体；联调验证当前写请求的权限、幂等重试及实际结果。
export async function registerGpuCluster(
  input: RegisterGpuClusterInput,
  scope: GpuOperationScope,
): Promise<void> {
  requireGpuScope(scope);
  if (input.expected_cluster_id !== scope.cluster_id) throw new Error("请先确认平台主体和目标集群");
  await runIdempotentRequest(
    registerScope,
    input,
    async (data) => {
      const cluster = await adminRequest<GpuCluster, { data: typeof data }>(
        "/accelerator/clusters",
        { method: "POST", data: { data } },
      );
      if (cluster.cluster_id !== input.expected_cluster_id)
        throw new Error("登记结果与确认目标不一致，请刷新目标并核对原提交");
    },
    [scope.principal, scope.connection_ref, scope.cluster_id],
  );
}
// TODO(request-migration): 后端移除 data 包装后，同步调整请求体；联调验证当前写请求的权限、幂等重试及实际结果。
export async function createGpuPool(
  input: CreateGpuPoolInput,
  scope: GpuOperationScope,
): Promise<void> {
  requireGpuScope(scope);
  await runIdempotentRequest(
    poolScope,
    input,
    async (data) => {
      await adminRequest("/accelerator/pools", { method: "POST", data: { data } });
    },
    [scope.principal, scope.connection_ref, scope.cluster_id],
  );
}
// TODO(request-migration): 后端移除 data 包装后，同步调整请求体；联调验证当前写请求的权限、幂等重试及实际结果。
export async function adoptGpuSupply(
  input: AdoptGpuSupplyInput,
  scope: GpuOperationScope,
): Promise<void> {
  requireGpuScope(scope);
  await runIdempotentRequest(
    adoptScope,
    input,
    async (data) => {
      await adminRequest("/accelerator/supply-groups:adopt", { method: "POST", data: { data } });
    },
    [scope.principal, scope.connection_ref, scope.cluster_id],
  );
}
// TODO(request-migration): 后端移除 data 包装后，同步调整请求体；联调验证当前写请求的权限、幂等重试及实际结果。
export async function setGpuAdmission(
  { group_id, ...input }: SetGpuAdmissionInput,
  scope: GpuOperationScope,
): Promise<void> {
  requireGpuScope(scope);
  await runIdempotentRequest(
    admissionScope,
    input,
    async (data) => {
      await adminRequest(
        `/accelerator/supply-groups/${encodeURIComponent(group_id)}:set-admission`,
        { method: "POST", data: { data } },
      );
    },
    [scope.principal, scope.connection_ref, scope.cluster_id, group_id],
  );
}
// TODO(request-migration): 后端移除 data 包装后，同步调整请求体；联调验证当前写请求的权限、幂等重试及实际结果。
export async function createGpuProfile(
  input: CreateGpuProfileInput,
  scope: GpuOperationScope,
): Promise<void> {
  requireGpuScope(scope);
  await runIdempotentRequest(
    profileScope,
    input,
    async (data) => {
      await adminRequest("/accelerator/profiles", { method: "POST", data: { data } });
    },
    [scope.principal, scope.connection_ref, scope.cluster_id],
  );
}
// TODO(request-migration): 后端移除 data 包装后，同步调整请求体；联调验证当前写请求的权限、幂等重试及实际结果。
export async function setGpuProfileState(
  { profile_id, ...input }: SetGpuProfileStateInput,
  scope: GpuOperationScope,
): Promise<void> {
  requireGpuScope(scope);
  await runIdempotentRequest(
    stateScope,
    input,
    async (data) => {
      await adminRequest(`/accelerator/profiles/${encodeURIComponent(profile_id)}:set-state`, {
        method: "POST",
        data: { data },
      });
    },
    [scope.principal, scope.connection_ref, scope.cluster_id, profile_id],
  );
}
// TODO(request-migration): 后端移除 data 包装后，同步调整请求体；联调验证当前写请求的权限、幂等重试及实际结果。
export async function deleteGpuProfile(
  { profile_id, ...input }: DeleteGpuProfileInput,
  scope: GpuOperationScope,
): Promise<void> {
  requireGpuScope(scope);
  await runIdempotentRequest(
    deleteScope,
    input,
    async (data) => {
      await adminRequest(`/accelerator/profiles/${encodeURIComponent(profile_id)}:delete`, {
        method: "POST",
        data: { data },
      });
    },
    [scope.principal, scope.connection_ref, scope.cluster_id, profile_id],
  );
}

// TODO(pagination-migration): 集群选项暂只取首 100 项，不遍历分页；后端统一分页后复核选项策略。
export function listGpuClusterOptions(signal?: AbortSignal): Promise<GpuPage<GpuCluster>> {
  return listGpuClusters({ page_size: 100 }, signal);
}
