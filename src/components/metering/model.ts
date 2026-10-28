import type { ResourceUsageMetric } from "@/api/resource-usage";

export type MeteringDimension = ResourceUsageMetric;
export type ResourceUsagePeriod = "24h" | "7d" | "30d";

export const usagePeriodOptions = [
  { value: "24h", label: "近24小时" },
  { value: "7d", label: "近7天" },
  { value: "30d", label: "近30天" },
];

export const usagePeriodHours: Record<ResourceUsagePeriod, number> = {
  "24h": 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
};

export const meteringDimensions = [
  {
    key: "gpu",
    cardLabel: "GPU",
    label: "实际显存",
    unit: "GiB",
    description: "受管租户业务工作负载的实际显存合计，不代表已分配显存。",
  },
  {
    key: "cpu",
    cardLabel: "CPU",
    label: "实际使用核数",
    unit: "核",
    description: "受管租户业务工作负载的实际 CPU 使用核数合计。",
  },
  {
    key: "memory",
    cardLabel: "内存",
    label: "工作集内存",
    unit: "GiB",
    description: "受管租户业务工作负载的工作集内存合计。",
  },
] as const;
