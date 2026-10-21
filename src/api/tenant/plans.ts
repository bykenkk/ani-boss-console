import type { CursorPageParams } from "@/api/types";
import { fetchCursorPage, type CursorListResponse } from "./shared";
import { runIdempotentRequest } from "@/api/idempotency";
import { servicesRequest } from "@/api/request";
import { createIdempotencyScope } from "@/lib/idempotency";
import { tenantPath, tenantPlanPath } from "./shared";
import type {
  BoundTenant,
  CreateTenantPlanInput,
  TenantPlanAuditLog,
  TenantPlanDetail,
  TenantPlanListFilters,
  TenantPlanListItem,
  TenantPlanQuotaLimit,
  TenantPlanStatus,
  TenantQuotaMetaItem,
  TenantStatus,
  UpdateTenantPlanInput,
  UpdateTenantPlanLimitsInput,
} from "./types";

interface TenantPlanResponse {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: TenantPlanStatus;
  tenant_count: number;
  created_at: string;
  updated_at: string;
}

interface BoundTenantResponse {
  id: string;
  name: string;
  display_name: string;
  status: TenantStatus;
}

const createPlanScope = createIdempotencyScope("tenant-plan-create", ["POST"]);
const updatePlanScope = createIdempotencyScope("tenant-plan-update", ["PUT"]);
const updatePlanLimitsScope = createIdempotencyScope("tenant-plan-limits", ["PUT"]);
const planStatusScope = createIdempotencyScope("tenant-plan-status", ["POST"]);
const bindPlanScope = createIdempotencyScope("tenant-plan-bind", ["POST"]);

function mapTenantPlan(item: TenantPlanResponse): TenantPlanListItem {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    description: item.description,
    status: item.status,
    tenantCount: item.tenant_count,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

// TODO(pagination-migration): 当前保留 ANI 游标契约；正式页码契约完成后迁移，当前按需查询单页。
export async function fetchTenantPlans(
  filters: TenantPlanListFilters = {},
  page: CursorPageParams = {},
  signal?: AbortSignal,
): Promise<CursorListResponse<TenantPlanListItem>> {
  const response = await fetchCursorPage<TenantPlanResponse>(
    "/tenant-plans",
    { ...filters, ...page },
    signal,
  );
  return { ...response, items: response.items.map(mapTenantPlan) };
}

export async function fetchTenantPlan(planId: string): Promise<TenantPlanDetail> {
  const response = await servicesRequest<TenantPlanResponse>(tenantPlanPath(planId), {
    method: "GET",
  });
  return mapTenantPlan(response);
}

export async function fetchTenantQuotaMeta(): Promise<TenantQuotaMetaItem[]> {
  const response = await servicesRequest<{
    items: Array<{
      resource_type: string;
      display_name: string;
      unit: string;
      default_quota: number;
      is_discrete: boolean;
    }>;
  }>("/quota-meta", { method: "GET" });
  return response.items.map((item) => ({
    resourceType: item.resource_type,
    displayName: item.display_name,
    unit: item.unit,
    defaultQuota: item.default_quota,
    isDiscrete: item.is_discrete,
  }));
}

export async function fetchTenantPlanQuotaLimits(planId: string): Promise<TenantPlanQuotaLimit[]> {
  const response = await servicesRequest<{
    items: Array<{
      resource_type: string;
      display_name: string;
      unit: string;
      total: number;
    }>;
  }>(tenantPlanPath(planId, "/quota-limits"), { method: "GET" });
  return response.items.map((item) => ({
    resourceType: item.resource_type,
    displayName: item.display_name,
    unit: item.unit,
    total: item.total,
  }));
}

export async function createTenantPlan(input: CreateTenantPlanInput): Promise<void> {
  await runIdempotentRequest(
    createPlanScope,
    {
      code: input.code,
      name: input.name,
      description: input.description,
      quota_limits: input.quotaLimits.map((item) => ({
        resource_type: item.resourceType,
        total: item.total,
      })),
    },
    (body) =>
      servicesRequest<unknown, typeof body>("/tenant-plans", {
        method: "POST",
        data: body,
      }),
    [input.code],
  );
}

export async function updateTenantPlan(input: UpdateTenantPlanInput): Promise<void> {
  await runIdempotentRequest(
    updatePlanScope,
    { name: input.name, description: input.description },
    (body) =>
      servicesRequest<unknown, typeof body>(tenantPlanPath(input.planId), {
        method: "PUT",
        data: body,
      }),
    [input.planId],
  );
}

export async function updateTenantPlanQuotaLimits(
  input: UpdateTenantPlanLimitsInput,
): Promise<void> {
  await runIdempotentRequest(
    updatePlanLimitsScope,
    {
      items: input.items.map((item) => ({
        resource_type: item.resourceType,
        total: item.total,
      })),
    },
    (body) =>
      servicesRequest<unknown, typeof body>(tenantPlanPath(input.planId, "/quota-limits"), {
        method: "PUT",
        data: body,
      }),
    [input.planId],
  );
}

export async function updateTenantPlanStatus(
  planId: string,
  action: "activate" | "disable",
): Promise<void> {
  await runIdempotentRequest(
    planStatusScope,
    {},
    (body) =>
      servicesRequest<unknown, typeof body>(tenantPlanPath(planId, `/${action}`), {
        method: "POST",
        data: body,
      }),
    [planId, action],
  );
}

export async function deleteTenantPlan(planId: string): Promise<void> {
  await servicesRequest<unknown>(tenantPlanPath(planId), { method: "DELETE" });
}

async function fetchPlanTenants(planId: string, suffix: string): Promise<BoundTenant[]> {
  const response = await servicesRequest<{ items: BoundTenantResponse[] }>(
    tenantPlanPath(planId, suffix),
    { method: "GET" },
  );
  return response.items.map((item) => ({
    id: item.id,
    name: item.name,
    displayName: item.display_name,
    status: item.status,
  }));
}

export function fetchTenantPlanBoundTenants(planId: string) {
  return fetchPlanTenants(planId, "/tenants");
}

export function fetchTenantPlanBindableTenants(planId: string) {
  return fetchPlanTenants(planId, "/bindable-tenants");
}

export async function bindTenantPlan(tenantId: string, planId: string): Promise<void> {
  await runIdempotentRequest(
    bindPlanScope,
    { plan_id: planId },
    (body) =>
      servicesRequest<unknown, typeof body>(tenantPath(tenantId, "/plan"), {
        method: "POST",
        data: body,
      }),
    [tenantId, planId],
  );
}

// TODO(pagination-migration): 当前保留 ANI 游标契约；正式页码契约完成后迁移，当前按需查询单页。
export async function fetchTenantPlanAuditLogs(
  planId: string,
  page: CursorPageParams = {},
  signal?: AbortSignal,
): Promise<CursorListResponse<TenantPlanAuditLog>> {
  const response = await fetchCursorPage<{
    id: string;
    action: string;
    result: "success" | "failure";
    details?: Record<string, unknown> | null;
    created_at: string;
  }>(tenantPlanPath(planId, "/audit-logs"), page, signal);
  return {
    ...response,
    items: response.items.map((item) => ({
      id: item.id,
      action: item.action,
      result: item.result,
      details: item.details ?? null,
      createdAt: item.created_at,
    })),
  };
}
