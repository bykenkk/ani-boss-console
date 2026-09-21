import { runIdempotentRequest } from "@/api/idempotency";
import { servicesRequest } from "@/api/request";
import { createIdempotencyScope } from "@/lib/idempotency";
import { fetchAllCursorPages, tenantPath } from "./shared";
import type {
  AvailableTenantPlan,
  CreateTenantInput,
  QuotaChangeRequestStatus,
  ReviewTenantQuotaChangeInput,
  SubmitTenantQuotaChangeInput,
  TenantAuditLogEntry,
  TenantAuthConfig,
  TenantDetail,
  TenantLifecycleEntry,
  TenantListFilters,
  TenantListItem,
  TenantMutationResult,
  TenantQuotaChangeRequest,
  TenantQuotaItem,
  TenantSsoTestResult,
  TenantStatus,
  UpdateTenantInput,
  UpdateTenantSsoInput,
} from "./types";

interface TenantListItemResponse {
  id: string;
  name: string;
  display_name: string;
  plan_id: string;
  plan_code: string;
  status: TenantStatus;
  admin_count: number;
  created_at: string;
}

interface TenantDetailResponse extends TenantListItemResponse {
  contact_email: string | null;
  user_count: number;
  frozen_at: string | null;
  disabled_at: string | null;
  auth: { sso_enabled: boolean; mfa_required: boolean };
  updated_at: string;
}

interface TenantAuthResponse {
  sso_enabled: boolean;
  provider: string | null;
  mfa_required: boolean;
  updated_at: string;
}

interface TenantQuotaResponse {
  items: Array<{
    resource_type: string;
    display_name: string;
    used: number;
    total: number;
    unit: string;
  }>;
}

interface QuotaChangeRequestResponse {
  request_id: string;
  tenant_id: string;
  resource_type: string;
  old_value: number;
  new_value: number;
  status: QuotaChangeRequestStatus;
  requested_by: string;
  created_at: string;
}

interface LifecycleResponse {
  id: string;
  action: TenantLifecycleEntry["action"];
  reason?: string | null;
  user_id?: string | null;
  request_id?: string | null;
  created_at: string;
}

interface AuditResponse {
  id: string;
  action: string;
  resource: string;
  result: TenantAuditLogEntry["result"];
  user_id?: string | null;
  details?: Record<string, unknown> | null;
  created_at: string;
}

const createTenantScope = createIdempotencyScope("tenant-create", ["POST"]);
const updateTenantScope = createIdempotencyScope("tenant-update", ["PUT"]);
const tenantStatusScope = createIdempotencyScope("tenant-status", ["POST"]);
const tenantSsoScope = createIdempotencyScope("tenant-sso", ["PUT"]);
const tenantSsoTestScope = createIdempotencyScope("tenant-sso-test", ["POST"]);
const tenantMfaScope = createIdempotencyScope("tenant-mfa", ["PUT"]);
const quotaRequestScope = createIdempotencyScope("tenant-quota-request", ["POST"]);
const quotaReviewScope = createIdempotencyScope("tenant-quota-review", ["POST"]);

function mapTenantListItem(item: TenantListItemResponse): TenantListItem {
  return {
    id: item.id,
    name: item.name,
    displayName: item.display_name,
    planId: item.plan_id,
    planCode: item.plan_code,
    status: item.status,
    administratorCount: item.admin_count,
    createdAt: item.created_at,
  };
}

export async function fetchTenants(filters: TenantListFilters = {}): Promise<TenantListItem[]> {
  const items = await fetchAllCursorPages<TenantListItemResponse>("/tenants", filters);
  return items.map(mapTenantListItem);
}

export async function fetchTenant(tenantId: string): Promise<TenantDetail> {
  const item = await servicesRequest<TenantDetailResponse>(tenantPath(tenantId), {
    method: "GET",
  });
  return {
    ...mapTenantListItem(item),
    contactEmail: item.contact_email,
    userCount: item.user_count,
    frozenAt: item.frozen_at,
    disabledAt: item.disabled_at,
    ssoEnabled: item.auth.sso_enabled,
    mfaRequired: item.auth.mfa_required,
    updatedAt: item.updated_at,
  };
}

export async function fetchAvailableTenantPlans(): Promise<AvailableTenantPlan[]> {
  const response = await servicesRequest<{
    items: Array<{ id: string; code: string; name: string }>;
  }>("/tenants/available-plans", { method: "GET" });
  return response.items;
}

export function createTenant(input: CreateTenantInput): Promise<TenantMutationResult> {
  return runIdempotentRequest(
    createTenantScope,
    {
      name: input.name,
      display_name: input.displayName,
      email: input.contactEmail,
      plan_id: input.planId,
      admin_email: input.administratorEmail,
      admin_name: input.administratorName,
      admin_password: input.administratorPassword,
    },
    (body) =>
      servicesRequest<TenantMutationResult, typeof body>("/tenants", {
        method: "POST",
        data: body,
      }),
    [input.name],
  );
}

export function updateTenant(input: UpdateTenantInput): Promise<TenantMutationResult> {
  const { tenantId, displayName, contactEmail } = input;
  return runIdempotentRequest(
    updateTenantScope,
    { display_name: displayName, contact_email: contactEmail },
    (body) =>
      servicesRequest<TenantMutationResult, typeof body>(tenantPath(tenantId), {
        method: "PUT",
        data: body,
      }),
    [tenantId],
  );
}

export function updateTenantStatus(
  tenantId: string,
  action: "freeze" | "unfreeze" | "disable",
): Promise<TenantMutationResult> {
  return runIdempotentRequest(
    tenantStatusScope,
    {},
    (body) =>
      servicesRequest<TenantMutationResult, typeof body>(tenantPath(tenantId, `/${action}`), {
        method: "POST",
        data: body,
      }),
    [tenantId, action],
  );
}

export async function fetchTenantAuth(tenantId: string): Promise<TenantAuthConfig> {
  const response = await servicesRequest<TenantAuthResponse>(tenantPath(tenantId, "/auth/sso"), {
    method: "GET",
  });
  return {
    ssoEnabled: response.sso_enabled,
    provider: response.provider,
    mfaRequired: response.mfa_required,
    updatedAt: response.updated_at,
  };
}

export function updateTenantSso(input: UpdateTenantSsoInput): Promise<TenantMutationResult> {
  return runIdempotentRequest(
    tenantSsoScope,
    { sso_enabled: input.ssoEnabled, provider: input.provider },
    (body) =>
      servicesRequest<TenantMutationResult, typeof body>(tenantPath(input.tenantId, "/auth/sso"), {
        method: "PUT",
        data: body,
      }),
    [input.tenantId],
  );
}

export function updateTenantMfa(
  tenantId: string,
  mfaRequired: boolean,
): Promise<TenantMutationResult> {
  return runIdempotentRequest(
    tenantMfaScope,
    { mfa_required: mfaRequired },
    (body) =>
      servicesRequest<TenantMutationResult, typeof body>(tenantPath(tenantId, "/auth/mfa"), {
        method: "PUT",
        data: body,
      }),
    [tenantId],
  );
}

export function testTenantSso(tenantId: string): Promise<TenantSsoTestResult> {
  return runIdempotentRequest(
    tenantSsoTestScope,
    {},
    async (body) => {
      const response = await servicesRequest<
        {
          success: boolean;
          discovery_result?: Record<string, unknown> | null;
          error?: string | null;
          tested_at: string;
        },
        typeof body
      >(tenantPath(tenantId, "/auth/sso/test"), { method: "POST", data: body });
      return {
        success: response.success,
        discoveryResult: response.discovery_result ?? null,
        error: response.error ?? null,
        testedAt: response.tested_at,
      };
    },
    [tenantId],
  );
}

export async function fetchTenantQuota(tenantId: string): Promise<TenantQuotaItem[]> {
  const response = await servicesRequest<TenantQuotaResponse>(tenantPath(tenantId, "/quota"), {
    method: "GET",
  });
  return response.items.map((item) => ({
    resourceType: item.resource_type,
    displayName: item.display_name,
    used: item.used,
    total: item.total,
    unit: item.unit,
  }));
}

export async function fetchTenantQuotaChangeRequests(
  tenantId: string,
): Promise<TenantQuotaChangeRequest[]> {
  const response = await servicesRequest<{ items: QuotaChangeRequestResponse[] }>(
    tenantPath(tenantId, "/quota-requests"),
    { method: "GET" },
  );
  return response.items.map((item) => ({
    requestId: item.request_id,
    tenantId: item.tenant_id,
    resourceType: item.resource_type,
    oldValue: item.old_value,
    newValue: item.new_value,
    status: item.status,
    requestedBy: item.requested_by,
    createdAt: item.created_at,
  }));
}

export function submitTenantQuotaChangeRequest(
  input: SubmitTenantQuotaChangeInput,
): Promise<TenantMutationResult> {
  return runIdempotentRequest(
    quotaRequestScope,
    {
      items: input.items.map((item) => ({
        resource_type: item.resourceType,
        new_value: item.newValue,
      })),
    },
    (body) =>
      servicesRequest<TenantMutationResult, typeof body>(
        tenantPath(input.tenantId, "/quota-requests"),
        { method: "POST", data: body },
      ),
    [input.tenantId],
  );
}

export function reviewTenantQuotaChangeRequest(
  input: ReviewTenantQuotaChangeInput,
): Promise<TenantMutationResult> {
  return runIdempotentRequest(
    quotaReviewScope,
    { approved: input.approved },
    (body) =>
      servicesRequest<TenantMutationResult, typeof body>(
        tenantPath(
          input.tenantId,
          `/quota-requests/${encodeURIComponent(input.requestId)}/approve`,
        ),
        { method: "POST", data: body },
      ),
    [input.tenantId, input.requestId],
  );
}

export async function fetchTenantLifecycle(tenantId: string): Promise<TenantLifecycleEntry[]> {
  const items = await fetchAllCursorPages<LifecycleResponse>(tenantPath(tenantId, "/lifecycle"));
  return items.map((item) => ({
    id: item.id,
    action: item.action,
    reason: item.reason ?? null,
    userId: item.user_id ?? null,
    requestId: item.request_id ?? null,
    createdAt: item.created_at,
  }));
}

export async function fetchTenantAuditLogs(tenantId: string): Promise<TenantAuditLogEntry[]> {
  const items = await fetchAllCursorPages<AuditResponse>(tenantPath(tenantId, "/audit-logs"));
  return items.map((item) => ({
    id: item.id,
    action: item.action,
    resource: item.resource,
    result: item.result,
    userId: item.user_id ?? null,
    details: item.details ?? null,
    createdAt: item.created_at,
  }));
}
