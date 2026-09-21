import { runIdempotentRequest } from "@/api/idempotency";
import { servicesRequest } from "@/api/request";
import { createIdempotencyScope } from "@/lib/idempotency";
import { fetchAllCursorPages, tenantPath, tenantPlanPath } from "./shared";
import type {
  BoundTenant,
  CreateTenantPlanInput,
  TenantMutationResult,
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

export async function fetchTenantPlans(
  filters: TenantPlanListFilters = {},
): Promise<TenantPlanListItem[]> {
  const items = await fetchAllCursorPages<TenantPlanResponse>("/tenant-plans", filters);
  return items.map(mapTenantPlan);
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

export function createTenantPlan(input: CreateTenantPlanInput): Promise<TenantMutationResult> {
  return runIdempotentRequest(
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
      servicesRequest<TenantMutationResult, typeof body>("/tenant-plans", {
        method: "POST",
        data: body,
      }),
    [input.code],
  );
}

export function updateTenantPlan(input: UpdateTenantPlanInput): Promise<TenantMutationResult> {
  return runIdempotentRequest(
    updatePlanScope,
    { name: input.name, description: input.description },
    (body) =>
      servicesRequest<TenantMutationResult, typeof body>(tenantPlanPath(input.planId), {
        method: "PUT",
        data: body,
      }),
    [input.planId],
  );
}

export function updateTenantPlanQuotaLimits(
  input: UpdateTenantPlanLimitsInput,
): Promise<TenantMutationResult> {
  return runIdempotentRequest(
    updatePlanLimitsScope,
    {
      items: input.items.map((item) => ({
        resource_type: item.resourceType,
        total: item.total,
      })),
    },
    (body) =>
      servicesRequest<TenantMutationResult, typeof body>(
        tenantPlanPath(input.planId, "/quota-limits"),
        { method: "PUT", data: body },
      ),
    [input.planId],
  );
}

export function updateTenantPlanStatus(
  planId: string,
  action: "activate" | "disable",
): Promise<TenantMutationResult> {
  return runIdempotentRequest(
    planStatusScope,
    {},
    (body) =>
      servicesRequest<TenantMutationResult, typeof body>(tenantPlanPath(planId, `/${action}`), {
        method: "POST",
        data: body,
      }),
    [planId, action],
  );
}

export function deleteTenantPlan(planId: string): Promise<TenantMutationResult> {
  return servicesRequest<TenantMutationResult>(tenantPlanPath(planId), { method: "DELETE" });
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

export function bindTenantPlan(tenantId: string, planId: string): Promise<TenantMutationResult> {
  return runIdempotentRequest(
    bindPlanScope,
    { plan_id: planId },
    (body) =>
      servicesRequest<TenantMutationResult, typeof body>(tenantPath(tenantId, "/plan"), {
        method: "POST",
        data: body,
      }),
    [tenantId, planId],
  );
}

export async function fetchTenantPlanAuditLogs(planId: string): Promise<TenantPlanAuditLog[]> {
  const items = await fetchAllCursorPages<{
    id: string;
    action: string;
    result: "success" | "failure";
    details?: Record<string, unknown> | null;
    created_at: string;
  }>(tenantPlanPath(planId, "/audit-logs"));
  return items.map((item) => ({
    id: item.id,
    action: item.action,
    result: item.result,
    details: item.details ?? null,
    createdAt: item.created_at,
  }));
}
