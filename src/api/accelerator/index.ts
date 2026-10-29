import { adminRequest } from "@/api/request";
import { runIdempotentRequest } from "@/api/idempotency";
import { createIdempotencyScope } from "@/lib/idempotency";
import type {
  AdoptGpuSupplyInput,
  CreateGpuPoolInput,
  CreateGpuProfileInput,
  DeleteGpuProfileInput,
  GpuBindings,
  GpuCapacity,
  GpuCluster,
  GpuDevice,
  GpuPage,
  GpuPageParams,
  GpuPool,
  GpuProfile,
  GpuProfilePreview,
  GpuSupplyGroup,
  RegisterGpuClusterInput,
  SetGpuAdmissionInput,
  SetGpuProfileStateInput,
} from "./types";
export * from "./types";

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
// FIXME(cluster-scope): Gov 当前只转发 pool_id，尚未强制集群过滤；需补齐 cluster_id 转发及其与 pool_id 的一致性校验。
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
// TODO(pagination-migration): 后端支持 page/pageSize 和 items/total 后，切换公共页码分页并复核筛选。
export function listGpuBindings(
  params: GpuPageParams & { cluster_id: string; physical_device_id?: string },
  signal?: AbortSignal,
): Promise<GpuBindings> {
  return adminRequest("/accelerator/bindings", { params, signal });
}
export function getGpuCapacity(
  profile: Pick<GpuProfile, "profile_id" | "profile_version">,
  signal?: AbortSignal,
): Promise<GpuCapacity> {
  return adminRequest("/accelerator/capacity", {
    params: { ...profile, include_devices: true },
    signal,
  });
}
export function previewGpuProfile(
  group_id: string,
  parts: 2 | 4 | 8,
  signal?: AbortSignal,
): Promise<GpuProfilePreview> {
  return adminRequest("/accelerator/profiles:preview", { params: { group_id, parts }, signal });
}
// TODO(request-migration): 后端移除 data 包装后，同步调整请求体；联调验证当前写请求的权限、幂等重试及实际结果。
export async function registerGpuCluster(input: RegisterGpuClusterInput): Promise<void> {
  await runIdempotentRequest(registerScope, input, async (data) => {
    await adminRequest("/accelerator/clusters", { method: "POST", data: { data } });
  });
}
// TODO(request-migration): 后端移除 data 包装后，同步调整请求体；联调验证当前写请求的权限、幂等重试及实际结果。
export async function createGpuPool(input: CreateGpuPoolInput): Promise<void> {
  await runIdempotentRequest(poolScope, input, async (data) => {
    await adminRequest("/accelerator/pools", { method: "POST", data: { data } });
  });
}
// TODO(request-migration): 后端移除 data 包装后，同步调整请求体；联调验证当前写请求的权限、幂等重试及实际结果。
export async function adoptGpuSupply(input: AdoptGpuSupplyInput): Promise<void> {
  await runIdempotentRequest(adoptScope, input, async (data) => {
    await adminRequest("/accelerator/supply-groups:adopt", { method: "POST", data: { data } });
  });
}
// TODO(request-migration): 后端移除 data 包装后，同步调整请求体；联调验证当前写请求的权限、幂等重试及实际结果。
export async function setGpuAdmission({ group_id, ...input }: SetGpuAdmissionInput): Promise<void> {
  await runIdempotentRequest(
    admissionScope,
    input,
    async (data) => {
      await adminRequest(
        `/accelerator/supply-groups/${encodeURIComponent(group_id)}:set-admission`,
        { method: "POST", data: { data } },
      );
    },
    [group_id],
  );
}
// TODO(request-migration): 后端移除 data 包装后，同步调整请求体；联调验证当前写请求的权限、幂等重试及实际结果。
export async function createGpuProfile(input: CreateGpuProfileInput): Promise<void> {
  await runIdempotentRequest(profileScope, input, async (data) => {
    await adminRequest("/accelerator/profiles", { method: "POST", data: { data } });
  });
}
// TODO(request-migration): 后端移除 data 包装后，同步调整请求体；联调验证当前写请求的权限、幂等重试及实际结果。
export async function setGpuProfileState({
  profile_id,
  ...input
}: SetGpuProfileStateInput): Promise<void> {
  await runIdempotentRequest(
    stateScope,
    input,
    async (data) => {
      await adminRequest(`/accelerator/profiles/${encodeURIComponent(profile_id)}:set-state`, {
        method: "POST",
        data: { data },
      });
    },
    [profile_id],
  );
}
// TODO(request-migration): 后端移除 data 包装后，同步调整请求体；联调验证当前写请求的权限、幂等重试及实际结果。
export async function deleteGpuProfile({
  profile_id,
  ...input
}: DeleteGpuProfileInput): Promise<void> {
  await runIdempotentRequest(
    deleteScope,
    input,
    async (data) => {
      await adminRequest(`/accelerator/profiles/${encodeURIComponent(profile_id)}:delete`, {
        method: "POST",
        data: { data },
      });
    },
    [profile_id],
  );
}

// TODO(pagination-migration): 集群选项暂只取首 100 项，不遍历分页；后端统一分页后复核选项策略。
export function listGpuClusterOptions(signal?: AbortSignal): Promise<GpuPage<GpuCluster>> {
  return listGpuClusters({ page_size: 100 }, signal);
}
