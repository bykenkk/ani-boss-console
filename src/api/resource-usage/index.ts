import { coreRequest } from "@/api/request";
import type {
  ResourceUsageOverview,
  ResourceUsageParams,
  ResourceUsageRanking,
  ResourceUsageRankingParams,
  ResourceUsageTenantDetail,
} from "./types";

export * from "./types";

export const resourceUsageKeys = {
  overview: (params: ResourceUsageParams) => ["resource-usage", "overview", params] as const,
  tenants: (params: ResourceUsageRankingParams) => ["resource-usage", "tenants", params] as const,
  tenant: (tenantId: number, params: ResourceUsageParams) =>
    ["resource-usage", "tenant", tenantId, params] as const,
};

export function getResourceUsageOverview(params: ResourceUsageParams, signal?: AbortSignal) {
  return coreRequest<ResourceUsageOverview>("/admin/resource-usage/overview", {
    params: { ...params },
    signal,
  });
}

export function listResourceUsageTenants(params: ResourceUsageRankingParams, signal?: AbortSignal) {
  return coreRequest<ResourceUsageRanking>("/admin/resource-usage/tenants", {
    params: { ...params },
    signal,
  });
}

export function getResourceUsageTenant(
  tenantId: number,
  params: ResourceUsageParams,
  signal?: AbortSignal,
) {
  return coreRequest<ResourceUsageTenantDetail>(`/admin/resource-usage/tenants/${tenantId}`, {
    params: { ...params },
    signal,
  });
}
