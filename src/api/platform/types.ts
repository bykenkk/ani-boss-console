export interface PlatformRuntimeProfile {
  mode: string;
  provider: string;
  realProvider: boolean;
  reason: string | null;
}

export interface PlatformCapacityRegion {
  id: string;
  code: string;
  name: string;
  displayName: string;
  status: string;
  openForTenant: boolean;
  azs: string[];
  tenantCount: number;
  capacity: {
    gpuTotal: number;
    gpuFree: number;
    nodes: number;
    cpuCores: number;
    memoryGiB: number;
  };
}

export interface PlatformCapacity {
  regions: PlatformCapacityRegion[];
  summary: {
    regionCount: number;
    gpuTotal: number;
    gpuFree: number;
    tenantCount: number;
    nodes: number;
    azs: string[];
  };
  profile: PlatformRuntimeProfile;
}

export type PlatformServiceScrapeStatus = "reachable" | "unreachable" | "unknown";

export type PlatformMeteringResourceType =
  | "instance_gpu_seconds"
  | "instance_cpu_seconds"
  | "instance_memory_gib_seconds";
export type PlatformMeteringGroupBy = "tenant_id" | "day" | "hour";

export interface PlatformMeteringUsageParams {
  startTime: string;
  endTime: string;
  resourceType?: PlatformMeteringResourceType;
  groupBy: PlatformMeteringGroupBy;
  tenantId?: string;
}

export interface PlatformMeteringUsageItem {
  tenantId?: string;
  resourceType: string;
  totalQuantity: number;
  unit: string;
  period?: string;
}

export interface PlatformMeteringUsage {
  items: PlatformMeteringUsageItem[];
  total: number;
  profile: PlatformRuntimeProfile;
}

export interface PlatformComponent {
  name: string;
  kind: string;
  namespace: string;
  group: string;
  status: string;
  desiredReplicas: number;
  readyReplicas: number;
  version: string;
  scrapeStatus: PlatformServiceScrapeStatus | null;
  reason: string | null;
}

export interface PlatformComponentGroup {
  name: string;
  components: PlatformComponent[];
}

export interface PlatformComponents {
  observedAt: string;
  groups: PlatformComponentGroup[];
  profile: PlatformRuntimeProfile;
}

export interface PlatformComponentLog {
  container: string;
  level: string;
  message: string;
  pod: string;
  stream: string;
  timestamp: string;
}

export interface StreamPlatformComponentLogsOptions {
  component: string;
  limit: number;
  intervalSeconds: number;
  signal?: AbortSignal;
  onConnected?: () => void;
  onLog: (log: PlatformComponentLog) => void;
}
