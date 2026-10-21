import { runIdempotentOperation } from "@/api/idempotency";
import { coreRequest } from "@/api/request";
import { createIdempotencyScope } from "@/lib/idempotency";
import type {
  ApiRuntimeProfile,
  GpuInventorySnapshot,
  GpuInventoryStatus,
  GpuInventoryEventSnapshot,
  GpuInventoryEventType,
  GpuOccupancy,
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

const GPU_RESOURCE_TYPE = "gpu_count";
const reservationScope = createIdempotencyScope("tenant-gpu-reservation", ["PUT"]);

export const gpuResourcePoolQueryKeys = {
  inventory: ["gpu-resource-pool", "inventory"] as const,
  occupancy: ["gpu-resource-pool", "occupancy"] as const,
  tenants: ["gpu-resource-pool", "tenants"] as const,
  events: ["gpu-resource-pool", "events"] as const,
};

function mapRuntimeProfile(profile: ApiRuntimeProfileResponse): ApiRuntimeProfile {
  return {
    mode: profile.mode,
    provider: profile.provider,
    realProvider: profile.real_provider,
    reason: profile.reason,
  };
}

// TODO(api-migration): 当前使用 ANI 旧库存接口；对应能力迁移后替换调用，并复核分页与资源身份。
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

// TODO(api-migration): 当前使用 ANI 旧占用汇总接口；对应能力迁移后替换调用并核对统计口径。
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

// TODO(api-migration): 当前使用 ANI 旧库存事件接口；对应能力迁移后替换调用并复核分页。
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

// FIXME(pagination-migration): 当前遍历旧 /quotas 游标分页汇总全量数据，请求数、加载耗时和内存占用随租户数增长。
// 核实 GPU 配额列表的服务端筛选与分页契约后，改为按需查询当前页，并迁移调用方后移除此方法。
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

// FIXME(api-migration): 当前在前端筛选 GPU 配额，页面必须等待旧租户配额全量加载，无法独立按 GPU 条件请求当前页。
// 当前 ANI /quotas 仅支持 limit/cursor，无 GPU 条件；后端补齐 GPU 筛选与分页契约后迁移，不用单页本地筛选伪装整改完成。
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

// TODO(api-migration): 当前使用 ANI 旧租户 GPU 配额接口；对应写入契约迁移后替换调用并复核额度语义。
export async function updateTenantGpuQuota({
  tenantId,
  total,
}: UpdateTenantGpuQuotaInput): Promise<void> {
  const data = { items: [{ resource_type: GPU_RESOURCE_TYPE, total }] };
  await coreRequest<unknown, typeof data>(`/admin/tenants/${encodeURIComponent(tenantId)}/quota`, {
    method: "PUT",
    data,
  });
}

// TODO(api-migration): 当前使用 ANI 旧租户 GPU 预留接口；对应写入契约迁移后替换调用并复核幂等行为。
export async function updateTenantGpuReservation({
  tenantId,
  allocatedGpuCount,
}: UpdateTenantGpuReservationInput): Promise<void> {
  const submitData = { allocated_gpu_count: allocatedGpuCount };
  await runIdempotentOperation(
    reservationScope,
    submitData,
    (idempotencyKey) =>
      coreRequest<unknown, typeof submitData>(
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

export type {
  ApiRuntimeProfile,
  GpuInventoryDevice,
  GpuInventoryEvent,
  GpuInventoryEventSnapshot,
  GpuInventoryEventType,
  GpuInventorySnapshot,
  GpuInventoryStatus,
  GpuOccupancy,
  GpuShareCount,
  TenantGpuAllocation,
  UpdateTenantGpuQuotaInput,
  UpdateTenantGpuReservationInput,
} from "./types";
