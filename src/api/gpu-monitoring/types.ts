import type { GpuDevice } from "@/api/accelerator";
import type { PageParams } from "@/api/types";

export interface GpuDeviceListParams extends PageParams {
  clusterId: string;
  modelKey?: string;
}
export interface GpuDeviceList {
  items: GpuDevice[];
  total: string;
}

// Monitoring is exporter observation. These nullable values are independent of
// Gov quota balances and of native allocation / bound Pod request capacity.
export interface GpuQuality {
  status: string;
  reasons: string[];
  completePoints: number;
  observedPoints: number;
  expectedPoints: number;
  partialPoints: number;
  emptyPoints: number;
  coverage: number | null;
  observedSources: number;
  expectedSources: number | null;
}
export interface GpuPoint {
  timestamp: string | null;
  end: string | null;
  value: number | null;
  peak: number | null;
  knownValue: number | null;
  knownPeak: number | null;
  quality: GpuQuality | null;
  sampleTimeMin: string | null;
  sampleTimeMax: string | null;
}
export interface GpuSeries {
  metricCode: string;
  unit: string;
  aggregation: string;
  baseResolutionSeconds: number;
  points: GpuPoint[];
  mean: number | null;
  peak: number | null;
  quality: GpuQuality | null;
  metricAvailableFrom: string | null;
  dataCutoff: string | null;
  capability: string;
  eventCode: string;
  semantics: string;
  exporterProcessStarts: string[];
}
export interface GpuQueryResponse {
  queryTime: string | null;
  start: string | null;
  end: string | null;
  effectiveStepSeconds: number;
  series: GpuSeries[];
  // Complete returned buckets do not prove coverage of all tenant workloads.
  indexComplete: boolean;
  includedResourceKinds: string[];
  uncoveredResourceKinds: string[];
  resourceKind: string;
  resourceId: string;
  tenantId?: number;
}
