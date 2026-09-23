import { compareDateValuesDesc } from "@/lib/date";

export type TenantStatus = "active" | "suspended" | "disabled";
export type TenantSsoStatus = "disconnected" | "configured" | "connected";
export type TenantQuotaRequestStatus = "pending" | "approved" | "rejected";
export type TenantAdminStatus = "active" | "invited" | "disabled";
export type TenantOperationStatus = "success" | "failed";
export type TenantLifecycleEventType =
  | "created"
  | "suspended"
  | "resumed"
  | "disabled"
  | "trial_extended"
  | "trial_converted"
  | "trial_expired"
  | "overdue_detected"
  | "overdue_suspended"
  | "arrears_policy_updated";
export type TenantBillingStatus = "current" | "overdue" | "settled" | "credited";
export type TenantAdminRole = "租户所有者" | "租户管理员" | "只读审计";

export interface TenantAdmin {
  id: string;
  tenantId: string;
  tenantName: string;
  name: string;
  displayName: string;
  email: string;
  role: TenantAdminRole;
  status: TenantAdminStatus;
  source: "本地" | "IdP";
  lastLogin: string;
  mfa: boolean;
  invitedAt: string;
  lastResetAt?: string;
}

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

export interface TenantLifecycleEvent {
  id: string;
  at: string;
  event: TenantLifecycleEventType;
  by: string;
  message: string;
}

export interface TenantOperation {
  id: string;
  operation: string;
  status: TenantOperationStatus;
  message: string;
  createdAt: string;
  by: string;
}

export interface TenantArrearsPolicy {
  graceDays: number;
  autoSuspend: boolean;
  emailNotification: boolean;
}

export interface TenantResourceSummary {
  vms: number;
  inferences: number;
  models: number;
  kbs: number;
}

export interface TenantUsage {
  gpuHours: number;
  cpuHours: number;
  storageGi: number;
  tokens: number;
  kbQueries: number;
}

export interface TenantQuotaLimits {
  gpuHours: number;
  cpuCores: number;
  memoryGi: number;
  storageGi: number;
  tokenQuota: number;
  kbQueries: number;
  maxMembers: number;
  maxInferences: number;
}

export interface TenantQuotaRequest {
  id: string;
  status: TenantQuotaRequestStatus;
  requestedAt: string;
  by: string;
  reason: string;
  currentGpuHours: number;
  requestedGpuHours: number;
  currentStorageGi: number;
  requestedStorageGi: number;
  resolvedAt?: string;
  rejectReason?: string;
}

export interface TenantQuotaPackage {
  name: string;
  status: "enabled" | "draft";
  planCode: string;
  isTrial: boolean;
  description?: string;
  updatedAt?: string;
  defaultTrialDays?: number;
  limits: TenantQuotaLimits;
}

export interface Tenant {
  id: string;
  name: string;
  displayName: string;
  status: TenantStatus;
  specification: string;
  quotaPackage: string;
  planCode: string;
  memberCount: number;
  adminCount: number;
  balanceUsd: number;
  creditUsd: number;
  region: string;
  regionName: string;
  isTrial: boolean;
  createdAt: string;
  contact: string;
  industry: string;
  ssoEnabled: boolean;
  ssoProvider: string;
  ssoStatus: TenantSsoStatus;
  ssoLastTestAt?: string;
  forceMfa: boolean;
  trialEndsAt?: string;
  suspendedAt?: string;
  suspendReason?: string;
  disabledAt?: string;
  arrearsPolicy: TenantArrearsPolicy;
  lifecycle: TenantLifecycleEvent[];
  operations: TenantOperation[];
  resourceSummary: TenantResourceSummary;
  usage: TenantUsage;
  quotaLimits: TenantQuotaLimits;
  quotaRequests: TenantQuotaRequest[];
}

export interface TenantDraft {
  name: string;
  displayName: string;
  contact: string;
  industry: string;
  region: string;
  quotaPackage: string;
  isTrial: boolean;
  adminName: string;
  adminEmail: string;
}

export const tenantStatusMeta = {
  active: { label: "活跃", color: "green" },
  suspended: { label: "冻结", color: "orange" },
  disabled: { label: "禁用", color: "gray" },
} as const;

export const tenantAdminRoles: TenantAdminRole[] = ["租户所有者", "租户管理员", "只读审计"];

export const tenantAdminStatusMeta = {
  active: { label: "活跃", color: "green" },
  invited: { label: "邀请中", color: "orange" },
  disabled: { label: "禁用", color: "gray" },
} as const;

export const tenantBillingStatusMeta = {
  current: { label: "账期内", color: "blue" },
  overdue: { label: "已欠费", color: "red" },
  settled: { label: "已结清", color: "green" },
  credited: { label: "已调账", color: "purple" },
} as const;

export const tenantLifecycleEventMeta = {
  created: { label: "租户开通", color: "green" },
  suspended: { label: "租户冻结", color: "orange" },
  resumed: { label: "租户解冻", color: "green" },
  disabled: { label: "租户禁用", color: "red" },
  trial_extended: { label: "试用延期", color: "blue" },
  trial_converted: { label: "试用转正式", color: "purple" },
  trial_expired: { label: "试用到期", color: "orange" },
  overdue_detected: { label: "检测到欠费", color: "red" },
  overdue_suspended: { label: "欠费冻结", color: "red" },
  arrears_policy_updated: { label: "欠费策略更新", color: "blue" },
} as const;

export const tenantRegions = [
  { label: "华东一区", value: "cn-east-1" },
  { label: "华北（北京）", value: "cn-north" },
  { label: "西南一区", value: "cn-southwest-1" },
] as const;

export const tenantQuotaPackages: TenantQuotaPackage[] = [
  {
    name: "标准配额",
    status: "enabled",
    planCode: "std",
    isTrial: false,
    limits: {
      gpuHours: 500,
      cpuCores: 64,
      memoryGi: 256,
      storageGi: 2048,
      tokenQuota: 5_000_000,
      kbQueries: 50_000,
      maxMembers: 20,
      maxInferences: 10,
    },
  },
  {
    name: "GPU 增强",
    status: "enabled",
    planCode: "gpu-plus",
    isTrial: false,
    limits: {
      gpuHours: 2000,
      cpuCores: 128,
      memoryGi: 512,
      storageGi: 8192,
      tokenQuota: 20_000_000,
      kbQueries: 200_000,
      maxMembers: 50,
      maxInferences: 30,
    },
  },
  {
    name: "试用配额",
    status: "enabled",
    planCode: "trial",
    isTrial: true,
    defaultTrialDays: 30,
    limits: {
      gpuHours: 50,
      cpuCores: 16,
      memoryGi: 64,
      storageGi: 200,
      tokenQuota: 200_000,
      kbQueries: 2000,
      maxMembers: 5,
      maxInferences: 2,
    },
  },
  {
    name: "企业定制",
    status: "draft",
    planCode: "enterprise",
    isTrial: false,
    limits: {
      gpuHours: 8000,
      cpuCores: 512,
      memoryGi: 2048,
      storageGi: 50_000,
      tokenQuota: 100_000_000,
      kbQueries: 1_000_000,
      maxMembers: 200,
      maxInferences: 100,
    },
  },
];

export const quotaPackages = tenantQuotaPackages
  .filter((item) => item.status === "enabled")
  .map((item) => item.name);

const emptyResourceSummary: TenantResourceSummary = {
  vms: 0,
  inferences: 0,
  models: 0,
  kbs: 0,
};

const emptyUsage: TenantUsage = {
  gpuHours: 0,
  cpuHours: 0,
  storageGi: 0,
  tokens: 0,
  kbQueries: 0,
};

const defaultArrearsPolicy: TenantArrearsPolicy = {
  graceDays: 7,
  autoSuspend: true,
  emailNotification: true,
};

function getCreatedLifecycle(tenantId: string, createdAt: string): TenantLifecycleEvent[] {
  return [
    {
      id: `lifecycle-${tenantId}-created`,
      at: createdAt,
      event: "created",
      by: "system",
      message: "租户开通",
    },
  ];
}

function getCreatedOperation(tenantId: string, createdAt: string): TenantOperation {
  return {
    id: `operation-${tenantId}-created`,
    operation: "create",
    status: "success",
    message: "租户开通完成",
    createdAt,
    by: "platform-admin",
  };
}

export function getTenantUsageBreakdown(usage: TenantUsage): TenantUsageCost[] {
  return [
    {
      metric: "GPU-Hours",
      amount: usage.gpuHours,
      unitCost: 1.2,
      cost: Number((usage.gpuHours * 1.2).toFixed(2)),
    },
    {
      metric: "CPU-Hours",
      amount: usage.cpuHours,
      unitCost: 0.05,
      cost: Number((usage.cpuHours * 0.05).toFixed(2)),
    },
    {
      metric: "Storage-Gi",
      amount: usage.storageGi,
      unitCost: 0.02,
      cost: Number((usage.storageGi * 0.02).toFixed(2)),
    },
    {
      metric: "Tokens",
      amount: usage.tokens,
      unitCost: 0.000002,
      cost: Number((usage.tokens * 0.000002).toFixed(2)),
    },
    {
      metric: "KB Queries",
      amount: usage.kbQueries,
      unitCost: 0.001,
      cost: Number((usage.kbQueries * 0.001).toFixed(2)),
    },
  ];
}

function getPackageLimits(planCode: string): TenantQuotaLimits {
  const quotaPackage = tenantQuotaPackages.find((item) => item.planCode === planCode);
  return { ...(quotaPackage ?? tenantQuotaPackages[0]).limits };
}

export const initialTenantDraft: TenantDraft = {
  name: "",
  displayName: "",
  contact: "",
  industry: "通用",
  region: tenantRegions[0].value,
  quotaPackage: quotaPackages[0],
  isTrial: false,
  adminName: "",
  adminEmail: "",
};

export const initialTenants: Tenant[] = [
  {
    id: "tn-1001",
    name: "acme-ai",
    displayName: "星云智能科技",
    status: "active",
    specification: "-",
    quotaPackage: "GPU 增强",
    planCode: "gpu-plus",
    memberCount: 12,
    adminCount: 3,
    balanceUsd: 12800,
    creditUsd: 20000,
    region: "cn-east-1",
    regionName: "华东一区",
    isTrial: false,
    createdAt: "2026-06-18 10:24",
    contact: "ops@acme-ai.example",
    industry: "人工智能",
    ssoEnabled: true,
    ssoProvider: "企业 OIDC",
    ssoStatus: "connected",
    ssoLastTestAt: "2026-07-10 11:00",
    forceMfa: true,
    arrearsPolicy: { ...defaultArrearsPolicy },
    lifecycle: getCreatedLifecycle("tn-1001", "2026-06-18 10:24"),
    operations: [getCreatedOperation("tn-1001", "2026-06-18 10:24")],
    resourceSummary: { vms: 12, inferences: 8, models: 16, kbs: 4 },
    usage: {
      gpuHours: 980,
      cpuHours: 4500,
      storageGi: 3100,
      tokens: 8_000_000,
      kbQueries: 60_000,
    },
    quotaLimits: getPackageLimits("gpu-plus"),
    quotaRequests: [
      {
        id: "qr-acme-001",
        status: "pending",
        requestedAt: "2026-07-18 14:00",
        by: "ops@acme.ai",
        reason: "大模型评测峰值",
        currentGpuHours: 2000,
        requestedGpuHours: 4000,
        currentStorageGi: 8192,
        requestedStorageGi: 16_384,
      },
    ],
  },
  {
    id: "tn-1002",
    name: "future-lab",
    displayName: "未来实验室",
    status: "active",
    specification: "-",
    quotaPackage: "标准配额",
    planCode: "std",
    memberCount: 8,
    adminCount: 2,
    balanceUsd: 4260,
    creditUsd: 10000,
    region: "cn-east-1",
    regionName: "华东一区",
    isTrial: false,
    createdAt: "2026-07-02 14:08",
    contact: "admin@future-lab.example",
    industry: "科研",
    ssoEnabled: false,
    ssoProvider: "-",
    ssoStatus: "disconnected",
    forceMfa: true,
    arrearsPolicy: { ...defaultArrearsPolicy },
    lifecycle: getCreatedLifecycle("tn-1002", "2026-07-02 14:08"),
    operations: [getCreatedOperation("tn-1002", "2026-07-02 14:08")],
    resourceSummary: { vms: 4, inferences: 2, models: 3, kbs: 1 },
    usage: {
      gpuHours: 210,
      cpuHours: 1200,
      storageGi: 820,
      tokens: 1_200_000,
      kbQueries: 11_000,
    },
    quotaLimits: getPackageLimits("std"),
    quotaRequests: [],
  },
  {
    id: "tn-1003",
    name: "ocean-data",
    displayName: "远海数据服务",
    status: "suspended",
    specification: "-",
    quotaPackage: "企业定制",
    planCode: "enterprise",
    memberCount: 15,
    adminCount: 4,
    balanceUsd: -680,
    creditUsd: 20000,
    region: "cn-north",
    regionName: "华北（北京）",
    isTrial: false,
    createdAt: "2026-05-26 09:36",
    contact: "cloud@ocean-data.example",
    industry: "数据服务",
    ssoEnabled: true,
    ssoProvider: "企业 SAML",
    ssoStatus: "connected",
    ssoLastTestAt: "2026-06-01 09:30",
    forceMfa: true,
    suspendedAt: "2026-07-06 09:00",
    suspendReason: "欠费自动冻结",
    arrearsPolicy: { ...defaultArrearsPolicy },
    lifecycle: [
      {
        id: "lifecycle-tn-1003-overdue",
        at: "2026-07-06 09:00",
        event: "overdue_suspended",
        by: "system",
        message: "超过 7 天宽限期，欠费自动冻结",
      },
      ...getCreatedLifecycle("tn-1003", "2026-05-26 09:36"),
    ],
    operations: [
      {
        id: "operation-tn-1003-suspended",
        operation: "suspend",
        status: "success",
        message: "欠费自动冻结",
        createdAt: "2026-07-06 09:00",
        by: "system",
      },
      getCreatedOperation("tn-1003", "2026-05-26 09:36"),
    ],
    resourceSummary: { vms: 24, inferences: 14, models: 20, kbs: 9 },
    usage: {
      gpuHours: 3200,
      cpuHours: 18_000,
      storageGi: 12_000,
      tokens: 40_000_000,
      kbQueries: 220_000,
    },
    quotaLimits: getPackageLimits("enterprise"),
    quotaRequests: [],
  },
  {
    id: "tn_r5vcfu",
    name: "trial-lab",
    displayName: "Trial Lab",
    status: "active",
    specification: "-",
    quotaPackage: "试用配额",
    planCode: "trial",
    memberCount: 3,
    adminCount: 1,
    balanceUsd: 0,
    creditUsd: 0,
    region: "cn-north",
    regionName: "华北（北京）",
    isTrial: true,
    createdAt: "2026-07-01 09:00",
    contact: "lab@trial.edu",
    industry: "教育科研",
    ssoEnabled: false,
    ssoProvider: "-",
    ssoStatus: "disconnected",
    forceMfa: false,
    trialEndsAt: "2026-07-31 09:00",
    arrearsPolicy: { ...defaultArrearsPolicy },
    lifecycle: getCreatedLifecycle("tn_r5vcfu", "2026-07-01 09:00"),
    operations: [getCreatedOperation("tn_r5vcfu", "2026-07-01 09:00")],
    resourceSummary: { vms: 1, inferences: 0, models: 1, kbs: 0 },
    usage: {
      gpuHours: 12,
      cpuHours: 40,
      storageGi: 30,
      tokens: 50_000,
      kbQueries: 200,
    },
    quotaLimits: getPackageLimits("trial"),
    quotaRequests: [],
  },
  {
    id: "tn-1005",
    name: "legacy-team",
    displayName: "旧版协作团队",
    status: "disabled",
    specification: "-",
    quotaPackage: "标准配额",
    planCode: "std",
    memberCount: 0,
    adminCount: 0,
    balanceUsd: 0,
    creditUsd: 0,
    region: "cn-north",
    regionName: "华北（北京）",
    isTrial: false,
    createdAt: "2026-03-12 11:20",
    contact: "",
    industry: "通用",
    ssoEnabled: false,
    ssoProvider: "-",
    ssoStatus: "disconnected",
    forceMfa: false,
    disabledAt: "2026-07-12 16:30",
    arrearsPolicy: { ...defaultArrearsPolicy },
    lifecycle: [
      {
        id: "lifecycle-tn-1005-disabled",
        at: "2026-07-12 16:30",
        event: "disabled",
        by: "platform-admin",
        message: "租户禁用并清理名下资源",
      },
      ...getCreatedLifecycle("tn-1005", "2026-03-12 11:20"),
    ],
    operations: [
      {
        id: "operation-tn-1005-disabled",
        operation: "disable",
        status: "success",
        message: "租户禁用，名下资源已清理",
        createdAt: "2026-07-12 16:30",
        by: "platform-admin",
      },
      getCreatedOperation("tn-1005", "2026-03-12 11:20"),
    ],
    resourceSummary: { ...emptyResourceSummary },
    usage: { ...emptyUsage },
    quotaLimits: getPackageLimits("std"),
    quotaRequests: [],
  },
];

export const initialTenantBillings: TenantBilling[] = initialTenants.map((tenant) => {
  const billingByTenant: Record<
    string,
    Pick<
      TenantBilling,
      "status" | "usageCostUsd" | "invoiceNo" | "dueDate" | "adjustments" | "invoices"
    >
  > = {
    "tn-1001": {
      status: "current",
      usageCostUsd: 4200,
      invoiceNo: "INV-2607-02",
      dueDate: "2026-08-05",
      adjustments: [
        {
          id: "adj-acme-001",
          at: "2026-07-08 10:00",
          amountUsd: 500,
          reason: "合同优惠调账",
          by: "finance",
        },
      ],
      invoices: [
        {
          id: "invoice-acme-001",
          no: "INV-2607-02",
          period: "2026-07",
          amountUsd: 4200,
          status: "issued",
          issuedAt: "2026-07-31",
        },
      ],
    },
    "tn-1002": {
      status: "current",
      usageCostUsd: 1800,
      invoiceNo: "INV-2607-01",
      dueDate: "2026-08-05",
      adjustments: [],
      invoices: [
        {
          id: "invoice-future-001",
          no: "INV-2607-01",
          period: "2026-07",
          amountUsd: 1800,
          status: "issued",
          issuedAt: "2026-07-31",
        },
      ],
    },
    "tn-1003": {
      status: "overdue",
      usageCostUsd: 9600,
      invoiceNo: "INV-2606-88",
      dueDate: "2026-07-05",
      adjustments: [],
      invoices: [
        {
          id: "invoice-ocean-001",
          no: "INV-2606-88",
          period: "2026-07",
          amountUsd: 9600,
          status: "issued",
          issuedAt: "2026-06-30",
        },
      ],
    },
    tn_r5vcfu: {
      status: "current",
      usageCostUsd: 0,
      invoiceNo: undefined,
      dueDate: "-",
      adjustments: [],
      invoices: [],
    },
    "tn-1005": {
      status: "settled",
      usageCostUsd: 0,
      invoiceNo: undefined,
      dueDate: "-",
      adjustments: [],
      invoices: [],
    },
  };
  const preset = billingByTenant[tenant.id] ?? {
    status: tenant.balanceUsd < 0 ? "overdue" : "current",
    usageCostUsd: 0,
    invoiceNo: undefined,
    dueDate: "-",
    adjustments: [],
    invoices: [],
  };

  return {
    id: `billing-${tenant.id}`,
    tenantId: tenant.id,
    tenantName: tenant.name,
    status: preset.status,
    period: "2026-07",
    usageCostUsd: preset.usageCostUsd,
    creditUsd: tenant.creditUsd,
    balanceUsd: tenant.balanceUsd,
    invoiceNo: preset.invoiceNo,
    dueDate: preset.dueDate,
    usageBreakdown: getTenantUsageBreakdown(tenant.usage),
    adjustments: preset.adjustments,
    invoices: preset.invoices,
    operations: [
      ...preset.adjustments.map((adjustment) => ({
        id: `operation-${adjustment.id}`,
        operation: "授信调账",
        message: `${adjustment.amountUsd > 0 ? "+" : ""}${adjustment.amountUsd} USD · ${adjustment.reason}`,
        createdAt: adjustment.at,
        by: adjustment.by,
      })),
      ...preset.invoices.map((invoice) => ({
        id: `operation-${invoice.id}`,
        operation: "生成账单",
        message: `${invoice.no} · ${invoice.amountUsd} USD`,
        createdAt: `${invoice.issuedAt} 00:00`,
        by: "finance",
      })),
      {
        id: `billing-operation-${tenant.id}-created`,
        operation: "开通计费账户",
        message: `创建 ${tenant.name} 计费账户`,
        createdAt: tenant.createdAt,
        by: "system",
      },
    ].sort((a, b) => compareDateValuesDesc(a.createdAt, b.createdAt)),
    updatedAt: "2026-07-31 23:59",
  };
});

export const initialTenantAdmins: TenantAdmin[] = [
  {
    id: "tadm-1001",
    tenantId: "tn-1001",
    tenantName: "acme-ai",
    name: "alice",
    displayName: "爱丽丝",
    email: "alice@acme-ai.example",
    role: "租户所有者",
    status: "active",
    source: "本地",
    lastLogin: "2026-07-18 09:10",
    mfa: true,
    invitedAt: "2026-06-18",
  },
  {
    id: "tadm-1002",
    tenantId: "tn-1001",
    tenantName: "acme-ai",
    name: "bob",
    displayName: "鲍勃",
    email: "bob@acme.ai",
    role: "租户管理员",
    status: "active",
    source: "本地",
    lastLogin: "2026-07-17 21:00",
    mfa: true,
    invitedAt: "2026-06-19",
  },
  {
    id: "tadm-1003",
    tenantId: "tn-1001",
    tenantName: "acme-ai",
    name: "grace",
    displayName: "格蕾丝",
    email: "grace@acme.ai",
    role: "只读审计",
    status: "active",
    source: "本地",
    lastLogin: "2026-07-18 14:02",
    mfa: true,
    invitedAt: "2026-06-20",
  },
  {
    id: "tadm-2001",
    tenantId: "tn-1002",
    tenantName: "future-lab",
    name: "future.owner",
    displayName: "实验室所有者",
    email: "owner@future-lab.example",
    role: "租户所有者",
    status: "active",
    source: "本地",
    lastLogin: "2026-07-16 10:30",
    mfa: true,
    invitedAt: "2026-07-02",
  },
  {
    id: "tadm-2002",
    tenantId: "tn-1002",
    tenantName: "future-lab",
    name: "future.audit",
    displayName: "实验室审计员",
    email: "audit@future-lab.example",
    role: "只读审计",
    status: "active",
    source: "本地",
    lastLogin: "2026-07-15 08:20",
    mfa: true,
    invitedAt: "2026-07-03",
  },
  {
    id: "tadm-3001",
    tenantId: "tn-1003",
    tenantName: "ocean-data",
    name: "erin",
    displayName: "艾琳",
    email: "erin@ocean-data.example",
    role: "租户所有者",
    status: "active",
    source: "IdP",
    lastLogin: "2026-07-10 11:20",
    mfa: true,
    invitedAt: "2026-05-26",
  },
  {
    id: "tadm-3002",
    tenantId: "tn-1003",
    tenantName: "ocean-data",
    name: "ocean.ops",
    displayName: "远海运维",
    email: "ops@ocean-data.example",
    role: "租户管理员",
    status: "active",
    source: "IdP",
    lastLogin: "2026-07-09 17:40",
    mfa: true,
    invitedAt: "2026-05-27",
  },
  {
    id: "tadm-3003",
    tenantId: "tn-1003",
    tenantName: "ocean-data",
    name: "ocean.finance",
    displayName: "远海财务",
    email: "finance@ocean-data.example",
    role: "只读审计",
    status: "active",
    source: "IdP",
    lastLogin: "2026-07-08 13:10",
    mfa: true,
    invitedAt: "2026-05-28",
  },
  {
    id: "tadm-3004",
    tenantId: "tn-1003",
    tenantName: "ocean-data",
    name: "ocean.security",
    displayName: "远海安全",
    email: "security@ocean-data.example",
    role: "租户管理员",
    status: "disabled",
    source: "IdP",
    lastLogin: "2026-06-01 08:00",
    mfa: true,
    invitedAt: "2026-05-29",
  },
  {
    id: "tadm-trial-01",
    tenantId: "tn_r5vcfu",
    tenantName: "trial-lab",
    name: "carol",
    displayName: "卡萝尔",
    email: "carol@trial.edu",
    role: "租户管理员",
    status: "invited",
    source: "本地",
    lastLogin: "-",
    mfa: false,
    invitedAt: "2026-07-02",
  },
];
