import { adminRequest } from "@/api/request";
import type { TenantQuotaSummaryList, TenantQuotaSummaryParams } from "./types";
export * from "./types";

export const quotaKeys = {
  all: ["quota-accounts"] as const,
  summaries: (params: TenantQuotaSummaryParams) => ["quota-accounts", "summaries", params] as const,
};

export function listTenantQuotaSummaries(params: TenantQuotaSummaryParams, signal?: AbortSignal) {
  return adminRequest<TenantQuotaSummaryList>("/tenants/quota-account-summaries", {
    params: { ...params },
    signal,
  });
}
