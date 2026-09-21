import { runIdempotentOperation } from "@/api/idempotency";
import { ApiError, coreRequest } from "@/api/request";
import { createIdempotencyScope } from "@/lib/idempotency";
import type {
  ApiRuntimeProfile,
  CreateGpuPartitionInput,
  GpuInventorySnapshot,
  GpuInventoryStatus,
  GpuInventoryEventSnapshot,
  GpuInventoryEventType,
  GpuOccupancy,
  GpuPartitionFailedNode,
  GpuPartitionShares,
  GpuPartitionSkippedNode,
  GpuPartitionTask,
  GpuPartitionTaskResult,
  GpuShareCount,
  TenantGpuAllocation,
  UpdateTenantGpuQuotaInput,
  UpdateTenantGpuReservationInput,
} from "./types";

interface ApiRuntimeProfileResponse {
  mode: string;
  provider: string;
  real_provider: boolean;
  reason: string;
}

interface GpuInventoryItemResponse {
  id: string;
  node_name: string;
  gpu_type: string;
  gpu_index: number;
  memory_total_mb?: number;
  driver_version?: string;
  status: GpuInventoryStatus;
  tenant_id?: string | null;
  instance_id?: string | null;
  gpu_mode?: string;
  gpu_spec?: string;
  gpu_sharing_spec?: string;
  gpu_sharing_policy?: string;
  shares?: GpuShareCount;
  reason?: string | null;
}

interface GpuInventoryListResponse {
  items: GpuInventoryItemResponse[];
  dev_profile: ApiRuntimeProfileResponse;
}

interface GpuOccupancyResponse {
  total: number;
  in_use: number;
  available: number;
  fault: number;
  physical_card_count?: number;
  logical_card_count?: number;
  maintenance_count?: number;
  unavailable_count?: number;
  tenant_count?: number;
}

interface QuotaItemResponse {
  resource_type: string;
  total: number;
  used: number;
  reserved: number;
}

interface GpuReservationResponse {
  tenant_id: string;
  allocated_gpu_count: number;
  used: number;
  reserved: number;
  available: number;
  tightened?: boolean;
}

interface TenantQuotaResponse {
  tenant_id: string;
  tenant_name?: string;
  items: QuotaItemResponse[];
  gpu_reservation?: GpuReservationResponse | null;
}

interface QuotaListResponse {
  items: TenantQuotaResponse[];
  next_cursor?: string | null;
}

interface GpuInventoryEventResponse {
  id: string;
  device_id?: string | null;
  node_name?: string | null;
  gpu_type?: string | null;
  event_type: GpuInventoryEventType;
  reason?: string | null;
  actor?: string | null;
  created_at: string;
}

interface GpuInventoryEventListResponse {
  items?: GpuInventoryEventResponse[];
  dev_profile: ApiRuntimeProfileResponse;
}

interface GpuPartitionPodResponse {
  namespace?: string;
  name?: string;
  reason?: string;
}

interface GpuPartitionSkippedNodeResponse {
  node_name?: string;
  reason?: string;
  pods?: GpuPartitionPodResponse[];
}

interface GpuPartitionFailedNodeResponse {
  node_name?: string;
  ok?: boolean;
  reason?: string;
}

interface GpuPartitionTaskResultResponse {
  shares?: number;
  applied_nodes?: string[];
  skipped_nodes?: GpuPartitionSkippedNodeResponse[];
  failed_nodes?: GpuPartitionFailedNodeResponse[];
  last_message?: string;
}

interface GpuPartitionTaskResponse {
  id?: string;
  task_id?: string;
  idempotency_key?: string;
  task_type?: string;
  resource_type?: string;
  resource_id?: string;
  status?: string;
  attempt_count?: number;
  max_attempts?: number;
  progress_pct?: number;
  result?: GpuPartitionTaskResultResponse | null;
  error_message?: string | null;
  created_at?: string;
  completed_at?: string | null;
}

interface GpuPartitionTaskListResponse {
  items?: GpuPartitionTaskResponse[];
  next_cursor?: string | null;
}

const GPU_RESOURCE_TYPE = "gpu_count";
const partitionScope = createIdempotencyScope("gpu-partition", ["POST"]);
const reservationScope = createIdempotencyScope("tenant-gpu-reservation", ["PUT"]);

export const gpuResourcePoolQueryKeys = {
  inventory: ["gpu-resource-pool", "inventory"] as const,
  occupancy: ["gpu-resource-pool", "occupancy"] as const,
  tenants: ["gpu-resource-pool", "tenants"] as const,
  events: ["gpu-resource-pool", "events"] as const,
};

export const gpuPartitionQueryKeys = {
  latest: ["gpu-resource-pool", "partition-task", "latest"] as const,
  detail: (taskId: string) => ["gpu-resource-pool", "partition-task", taskId] as const,
};

function mapRuntimeProfile(profile: ApiRuntimeProfileResponse): ApiRuntimeProfile {
  return {
    mode: profile.mode,
    provider: profile.provider,
    realProvider: profile.real_provider,
    reason: profile.reason,
  };
}

function asPartitionShares(value?: number): GpuPartitionShares | undefined {
  return value === 2 || value === 4 || value === 8 ? value : undefined;
}

function mapSkippedNode(node: GpuPartitionSkippedNodeResponse): GpuPartitionSkippedNode {
  return {
    nodeName: node.node_name || "-",
    reason: node.reason || "-",
    pods: (node.pods || []).map((pod) => ({
      namespace: pod.namespace || "-",
      name: pod.name || "-",
      reason: pod.reason || undefined,
    })),
  };
}

function mapFailedNode(node: GpuPartitionFailedNodeResponse): GpuPartitionFailedNode {
  return {
    nodeName: node.node_name || "-",
    ok: node.ok,
    reason: node.reason || "-",
  };
}

function mapTaskResult(
  result?: GpuPartitionTaskResultResponse | null,
): GpuPartitionTaskResult | undefined {
  if (!result) return undefined;
  return {
    shares: asPartitionShares(result.shares),
    appliedNodes: result.applied_nodes || [],
    skippedNodes: (result.skipped_nodes || []).map(mapSkippedNode),
    failedNodes: (result.failed_nodes || []).map(mapFailedNode),
    lastMessage: result.last_message || undefined,
  };
}

function mapGpuPartitionTask(response: GpuPartitionTaskResponse): GpuPartitionTask {
  return {
    id: response.id || response.task_id || "",
    idempotencyKey: response.idempotency_key,
    taskType: response.task_type || "gpu_partition",
    resourceType: response.resource_type,
    resourceId: response.resource_id,
    status: response.status || "running",
    attemptCount: response.attempt_count,
    maxAttempts: response.max_attempts,
    progressPct: response.progress_pct || 0,
    result: mapTaskResult(response.result),
    errorMessage: response.error_message || undefined,
    createdAt: response.created_at,
    completedAt: response.completed_at || undefined,
  };
}

export async function fetchGpuInventory(): Promise<GpuInventorySnapshot> {
  const response = await coreRequest<GpuInventoryListResponse>("/gpu-inventory", {
    params: { limit: 200 },
  });
  return {
    items: (response.items || []).map((item) => ({
      id: item.id,
      nodeName: item.node_name,
      gpuType: item.gpu_type,
      gpuIndex: item.gpu_index,
      memoryTotalMb: item.memory_total_mb,
      driverVersion: item.driver_version,
      status: item.status,
      tenantId: item.tenant_id || undefined,
      instanceId: item.instance_id || undefined,
      gpuMode: item.gpu_mode,
      gpuSpec: item.gpu_spec,
      gpuSharingSpec: item.gpu_sharing_spec,
      gpuSharingPolicy: item.gpu_sharing_policy,
      shares: item.shares,
      reason: item.reason || undefined,
    })),
    profile: mapRuntimeProfile(response.dev_profile),
  };
}

export async function fetchGpuOccupancy(): Promise<GpuOccupancy> {
  const response = await coreRequest<GpuOccupancyResponse>("/gpu-inventory/occupancy");
  return {
    total: response.total,
    inUse: response.in_use,
    available: response.available,
    fault: response.fault,
    physicalCardCount: response.physical_card_count ?? response.total,
    logicalCardCount: response.logical_card_count ?? 0,
    maintenanceCount: response.maintenance_count ?? 0,
    unavailableCount: response.unavailable_count ?? 0,
    tenantCount: response.tenant_count ?? 0,
  };
}

export async function fetchGpuInventoryEvents(): Promise<GpuInventoryEventSnapshot> {
  const response = await coreRequest<GpuInventoryEventListResponse>("/gpu-inventory/events", {
    params: { limit: 200 },
  });
  return {
    items: (response.items || []).map((item) => ({
      id: item.id,
      deviceId: item.device_id || undefined,
      nodeName: item.node_name || undefined,
      gpuType: item.gpu_type || undefined,
      eventType: item.event_type,
      reason: item.reason || undefined,
      actor: item.actor || undefined,
      createdAt: item.created_at,
    })),
    profile: mapRuntimeProfile(response.dev_profile),
  };
}

async function fetchAllTenantQuotas(): Promise<TenantQuotaResponse[]> {
  const items: TenantQuotaResponse[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | undefined;

  do {
    const response = await coreRequest<QuotaListResponse>("/quotas", {
      params: { limit: 200, cursor },
    });
    items.push(...(response.items || []));
    cursor = response.next_cursor || undefined;
    if (cursor && seenCursors.has(cursor)) break;
    if (cursor) seenCursors.add(cursor);
  } while (cursor);

  return items;
}

export async function fetchTenantGpuAllocations(): Promise<TenantGpuAllocation[]> {
  const quotas = await fetchAllTenantQuotas();
  const gpuQuotas = quotas
    .map((quota) => ({
      quota,
      gpu: quota.items.find((item) => item.resource_type === GPU_RESOURCE_TYPE),
    }))
    .filter((item): item is { quota: TenantQuotaResponse; gpu: QuotaItemResponse } =>
      Boolean(item.gpu),
    );

  return gpuQuotas.map(({ quota, gpu }) => ({
    tenantId: quota.gpu_reservation?.tenant_id || quota.tenant_id,
    tenantName: quota.tenant_name || quota.tenant_id,
    quotaTotal: gpu.total,
    allocatedGpuCount: quota.gpu_reservation?.allocated_gpu_count ?? 0,
    used: quota.gpu_reservation?.used ?? gpu.used,
    reserved: quota.gpu_reservation?.reserved ?? gpu.reserved,
    available: quota.gpu_reservation?.available ?? gpu.total - gpu.used - gpu.reserved,
  }));
}

export function updateTenantGpuQuota({
  tenantId,
  total,
}: UpdateTenantGpuQuotaInput): Promise<unknown> {
  return coreRequest(`/admin/tenants/${encodeURIComponent(tenantId)}/quota`, {
    method: "PUT",
    data: { items: [{ resource_type: GPU_RESOURCE_TYPE, total }] },
  });
}

export function updateTenantGpuReservation({
  tenantId,
  allocatedGpuCount,
}: UpdateTenantGpuReservationInput): Promise<GpuReservationResponse> {
  const submitData = { allocated_gpu_count: allocatedGpuCount };
  return runIdempotentOperation(
    reservationScope,
    submitData,
    (idempotencyKey) =>
      coreRequest<GpuReservationResponse, typeof submitData>(
        `/admin/tenants/${encodeURIComponent(tenantId)}/reservations`,
        {
          method: "PUT",
          headers: { "Idempotency-Key": idempotencyKey },
          data: submitData,
        },
      ),
    [tenantId],
  );
}

export function createGpuPartition(input: CreateGpuPartitionInput): Promise<GpuPartitionTask> {
  return runIdempotentOperation(partitionScope, input, async (idempotencyKey) => {
    const response = await coreRequest<GpuPartitionTaskResponse, CreateGpuPartitionInput>(
      "/gpu-inventory/gpu-partitions",
      {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        data: input,
      },
    );
    const task = mapGpuPartitionTask(response);
    if (!task.id) throw new Error("GPU 切分任务创建成功，但响应中缺少任务 ID");
    return task;
  });
}

export async function fetchGpuPartitionTask(taskId: string): Promise<GpuPartitionTask> {
  const response = await coreRequest<GpuPartitionTaskResponse>(
    `/tasks/${encodeURIComponent(taskId)}`,
  );
  return mapGpuPartitionTask(response);
}

export async function fetchLatestGpuPartitionTask(): Promise<GpuPartitionTask | undefined> {
  const response = await coreRequest<GpuPartitionTaskListResponse>("/tasks", {
    params: { task_type: "gpu_partition", limit: 1 },
  });
  const latest = response.items?.[0];
  return latest ? mapGpuPartitionTask(latest) : undefined;
}

export function getGpuPartitionErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return error instanceof Error && error.message.trim() ? error.message : "请求失败，请稍后重试";
  }
  if (error.status === 403) return "需要平台管理员身份才能配置集群 GPU 切分";
  if (error.code === "NO_IDLE_WHOLECARD_GPUS") return "集群内没有可切分的空闲整卡节点";
  if (error.code === "UNAVAILABLE" || error.code === "NOT_CONFIGURED") {
    return "GPU 切分服务暂不可用，请稍后重试";
  }
  return error.message.trim() || "请求失败，请稍后重试";
}

export type {
  ApiRuntimeProfile,
  CreateGpuPartitionInput,
  GpuInventoryDevice,
  GpuInventoryEvent,
  GpuInventoryEventSnapshot,
  GpuInventoryEventType,
  GpuInventorySnapshot,
  GpuInventoryStatus,
  GpuOccupancy,
  GpuPartitionFailedNode,
  GpuPartitionPod,
  GpuPartitionShares,
  GpuPartitionSkippedNode,
  GpuPartitionTask,
  GpuPartitionTaskResult,
  GpuShareCount,
  TenantGpuAllocation,
  UpdateTenantGpuQuotaInput,
  UpdateTenantGpuReservationInput,
} from "./types";
