import { adminRequest } from "@/api/request";
import type {
  PlatformComponent,
  PlatformComponents,
  PlatformComponentsResponse,
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

export const platformQueryKeys = {
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

export async function fetchPlatformComponents(signal?: AbortSignal): Promise<PlatformComponents> {
  const response = await adminRequest<PlatformComponentsResponse>("/platform/components", {
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
  // 组件日志流按现有契约保留字符串 code 错误体。
  return adminRequest<ReadableStream<Uint8Array>>(
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

export type {
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
