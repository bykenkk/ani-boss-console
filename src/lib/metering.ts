const SECONDS_PER_HOUR = 3600;

export interface MeteringTenantRow {
  id: string;
  current: number;
  previous: number;
  trend: "up" | "down" | "flat";
}

export function toGpuHours(quantity: number) {
  return quantity / SECONDS_PER_HOUR;
}

export function formatUsage(value: number) {
  return value.toLocaleString("zh-CN", {
    maximumFractionDigits: 2,
  });
}

export function getChangeRate(current: number, previous: number) {
  if (previous === 0) return undefined;
  return ((current - previous) / previous) * 100;
}
