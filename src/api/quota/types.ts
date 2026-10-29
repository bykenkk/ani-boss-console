import type { QuotaAccount } from "@/api/plans";
import type { PageParams } from "@/api/types";

export interface TenantQuotaSummaryParams extends PageParams {
  tenantId?: number;
  quotaCode?: string;
}

export interface TenantQuotaSummary {
  tenantId: number;
  tenantName: string;
  tenantCode: string;
  planId?: number;
  planName: string;
  accounts: QuotaAccount[];
}

export interface QuotaAccountTotals {
  quotaCode: string;
  unit: string;
  configuredTenantCount: string;
  limit: string;
  occupied: string;
  available: string;
}

export interface TenantQuotaSummaryList {
  items: TenantQuotaSummary[];
  total: string;
  summary?: {
    configuredTenantCount: string;
    accounts: QuotaAccountTotals[];
  };
}
