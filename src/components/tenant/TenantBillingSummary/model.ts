export type TenantBillingStatus = "current" | "overdue" | "settled" | "credited";

export interface TenantUsageCost {
  metric: string;
  amount: number;
  unitCost: number;
  cost: number;
}

export interface TenantBillingAdjustment {
  id: string;
  at: string;
  amountUsd: number;
  reason: string;
  by: string;
}

export interface TenantInvoice {
  id: string;
  no: string;
  period: string;
  amountUsd: number;
  status: "issued";
  issuedAt: string;
}

export interface TenantBillingOperation {
  id: string;
  operation: string;
  message: string;
  createdAt: string;
  by: string;
}

export interface TenantBilling {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantDisplayName: string;
  status: TenantBillingStatus;
  period: string;
  usageCostUsd: number;
  creditUsd: number;
  balanceUsd: number;
  invoiceNo?: string;
  dueDate: string;
  usageBreakdown: TenantUsageCost[];
  adjustments: TenantBillingAdjustment[];
  invoices: TenantInvoice[];
  operations: TenantBillingOperation[];
  updatedAt: string;
}

export const tenantBillingStatusMeta = {
  current: { label: "账期内", tone: "info" },
  overdue: { label: "已欠费", tone: "danger" },
  settled: { label: "已结清", tone: "success" },
  credited: { label: "已调账", tone: "info" },
} as const;
