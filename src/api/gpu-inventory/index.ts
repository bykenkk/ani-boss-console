import { coreRequest } from "@/api/request";
import type {
  ApiRuntimeProfile,
  GpuInventorySnapshot,
  GpuInventoryStatus,
  GpuInventoryEventSnapshot,
  GpuInventoryEventType,
  GpuOccupancy,
  GpuShareCount,
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
} from "./types";
