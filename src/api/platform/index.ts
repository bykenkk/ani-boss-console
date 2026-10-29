import { coreRequest } from "@/api/request";
import type {
  PlatformCapacity,
  PlatformComponent,
  PlatformComponents,
  PlatformComponentsResponse,
  PlatformMeteringUsage,
  PlatformMeteringUsageParams,
  PlatformRuntimeProfile,
  StreamPlatformComponentLogsOptions,
} from "./types";

interface DevProfileResponse {
  mode: string;
  provider: string;
  real_provider: boolean;
  reason: string | null;
}

interface PlatformCapacityRegionResponse {
  id: string;
  code: string;
  name: string;
  display_name: string;
  status: string;
  open_for_tenant: boolean;
  azs: string[];
  tenant_count: number;
  capacity: {
    gpu_total: number;
    gpu_free: number;
    nodes: number;
    cpu_cores: number;
    memory_gib: number;
  };
}

interface PlatformCapacityResponse {
  regions: PlatformCapacityRegionResponse[];
  summary: {
    region_count: number;
    gpu_total: number;
    gpu_free: number;
    tenant_count: number;
    nodes: number;
    azs: string[];
  };
  dev_profile: DevProfileResponse;
}

interface PlatformMeteringUsageResponse {
  items: Array<{
    tenant_id?: string;
    resource_type: string;
    total_quantity: number;
    unit: string;
    period?: string;
  }>;
  total: number;
  dev_profile: DevProfileResponse;
}

export const platformQueryKeys = {
  capacity: ["platform", "capacity"] as const,
  components: ["platform", "components"] as const,
  meteringUsage: (params: PlatformMeteringUsageParams) =>
    ["platform", "metering-usage", params] as const,
};

function mapPlatformComponent(
  component: PlatformComponentsResponse["groups"][number]["components"][number],
): PlatformComponent {
  return {
    name: component.name,
    kind: component.kind,
    namespace: component.namespace,
    group: component.group,
    status: component.status,
    desiredReplicas: component.desired_replicas,
    readyReplicas: component.ready_replicas,
    version: component.version,
    scrapeStatus: component.scrape_status,
    reason: component.reason,
  };
}

function mapRuntimeProfile(profile: DevProfileResponse): PlatformRuntimeProfile {
  return {
    mode: profile.mode,
    provider: profile.provider,
    realProvider: profile.real_provider,
    reason: profile.reason,
  };
}

export async function fetchPlatformCapacity(): Promise<PlatformCapacity> {
  const response = await coreRequest<PlatformCapacityResponse>("/platform/capacity");

  return {
    regions: (response.regions || []).map((region) => ({
      id: region.id,
      code: region.code,
      name: region.name,
      displayName: region.display_name,
      status: region.status,
      openForTenant: region.open_for_tenant,
      azs: region.azs || [],
      tenantCount: region.tenant_count,
      capacity: {
        gpuTotal: region.capacity.gpu_total,
        gpuFree: region.capacity.gpu_free,
        nodes: region.capacity.nodes,
        cpuCores: region.capacity.cpu_cores,
        memoryGiB: region.capacity.memory_gib,
      },
    })),
    summary: {
      regionCount: response.summary.region_count,
      gpuTotal: response.summary.gpu_total,
      gpuFree: response.summary.gpu_free,
      tenantCount: response.summary.tenant_count,
      nodes: response.summary.nodes,
      azs: response.summary.azs || [],
    },
    profile: mapRuntimeProfile(response.dev_profile),
  };
}

// TODO: 在测试环境核对降级快照、平台身份与定时刷新，静态契约核对不替代联调。
export async function fetchPlatformComponents(signal?: AbortSignal): Promise<PlatformComponents> {
  const response = await coreRequest<PlatformComponentsResponse>("/platform/components", {
    signal,
  });

  return {
    observedAt: response.observed_at,
    groups: (response.groups || []).map((group) => ({
      name: group.name,
      components: (group.components || []).map(mapPlatformComponent),
    })),
    profile: mapRuntimeProfile(response.dev_profile),
  };
}

export async function streamPlatformComponentLogs({
  component,
  limit,
  intervalSeconds,
  signal,
}: StreamPlatformComponentLogsOptions): Promise<ReadableStream<Uint8Array>> {
  // TODO: 日志入口仍使用字符串 code 的旧错误体；后端统一后重新核对。联调需覆盖 8 秒结束和 429。
  return coreRequest<ReadableStream<Uint8Array>>(
    `/platform/components/${encodeURIComponent(component)}/logs/stream`,
    {
      method: "GET",
      adapter: "fetch",
      responseType: "stream",
      headers: { Accept: "text/event-stream" },
      params: { limit, interval_seconds: intervalSeconds },
      signal,
    },
  );
}

export async function fetchPlatformMeteringUsage(
  params: PlatformMeteringUsageParams,
): Promise<PlatformMeteringUsage> {
  const response = await coreRequest<PlatformMeteringUsageResponse>("/metering/usage/platform", {
    params: {
      start_time: params.startTime,
      end_time: params.endTime,
      resource_type: params.resourceType,
      group_by: params.groupBy,
      tenant_id: params.tenantId,
    },
  });

  return {
    items: (response.items || []).map((item) => ({
      tenantId: item.tenant_id,
      resourceType: item.resource_type,
      totalQuantity: item.total_quantity,
      unit: item.unit,
      period: item.period,
    })),
    total: response.total,
    profile: mapRuntimeProfile(response.dev_profile),
  };
}

export type {
  PlatformCapacity,
  PlatformCapacityRegion,
  PlatformComponent,
  PlatformComponentStatus,
  PlatformComponentGroup,
  PlatformComponentLog,
  PlatformComponents,
  PlatformMeteringGroupBy,
  PlatformMeteringResourceType,
  PlatformMeteringUsage,
  PlatformMeteringUsageItem,
  PlatformMeteringUsageParams,
  PlatformRuntimeProfile,
  PlatformServiceScrapeStatus,
  StreamPlatformComponentLogsOptions,
} from "./types";
