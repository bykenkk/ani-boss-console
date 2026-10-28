export type ResourceUsageMetric = "gpu" | "cpu" | "memory";
export type ResourceUsageOrder = "asc" | "desc";

export interface ResourceUsageParams {
  start: string;
  end: string;
  metric: ResourceUsageMetric;
}

export interface ResourceUsageRankingParams extends ResourceUsageParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  order?: ResourceUsageOrder;
}

export interface ResourceUsageQuality {
  status: "OK" | "PARTIAL" | "NO_DATA" | "UNAVAILABLE";
  reasons: string[];
  coverage?: number | null;
  observedPoints: number;
  expectedPoints: number;
  availableFrom?: string | null;
}

export interface ResourceUsagePoint {
  timestamp: string;
  end: string;
  value?: number | null;
  knownValue?: number | null;
  peak?: number | null;
}

export interface MetricUsage {
  metric: ResourceUsageMetric;
  unit: "GiB" | "cores";
  mean?: number | null;
  peak?: number | null;
  knownMean?: number | null;
  knownPeak?: number | null;
  peakAt?: string | null;
  quality: ResourceUsageQuality;
  points: ResourceUsagePoint[];
  activeTenantCount?: string | null;
}

export interface ResourceUsageOverview {
  start: string;
  end: string;
  stepSeconds: number;
  dataCutoff: string;
  metrics: MetricUsage[];
}

export interface ResourceUsageTenantRow {
  tenantId: number;
  tenantName: string;
  rank?: string | null;
  share?: number | null;
  usage: MetricUsage;
}

export interface ResourceUsageRanking extends ResourceUsageOverview {
  items: ResourceUsageTenantRow[];
  total: string;
}

export interface ResourceUsageTenantDetail extends ResourceUsageOverview {
  tenantId: number;
  tenantName: string;
}
