export type GpuInventoryStatus = "available" | "in_use" | "fault" | "maintenance" | "unavailable";
export type GpuShareCount = 1 | 2 | 4 | 8;

export interface ApiRuntimeProfile {
  mode: string;
  provider: string;
  realProvider: boolean;
  reason: string;
}

export interface GpuInventoryDevice {
  id: string;
  nodeName: string;
  gpuType: string;
  gpuIndex: number;
  memoryTotalMb?: number;
  driverVersion?: string;
  status: GpuInventoryStatus;
  tenantId?: string;
  instanceId?: string;
  gpuMode?: string;
  gpuSpec?: string;
  gpuSharingSpec?: string;
  gpuSharingPolicy?: string;
  shares?: GpuShareCount;
  reason?: string;
}

export interface GpuInventorySnapshot {
  items: GpuInventoryDevice[];
  profile: ApiRuntimeProfile;
}

export interface GpuOccupancy {
  total: number;
  inUse: number;
  available: number;
  fault: number;
  physicalCardCount: number;
  logicalCardCount: number;
  maintenanceCount: number;
  unavailableCount: number;
  tenantCount: number;
}

export type GpuInventoryEventType = "status_changed" | "partition_applied";

export interface GpuInventoryEvent {
  id: string;
  deviceId?: string;
  nodeName?: string;
  gpuType?: string;
  eventType: GpuInventoryEventType;
  reason?: string;
  actor?: string;
  createdAt: string;
}

export interface GpuInventoryEventSnapshot {
  items: GpuInventoryEvent[];
  profile: ApiRuntimeProfile;
}
