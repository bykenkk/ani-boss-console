export type GpuQuotaCode = "gpu.physical.count" | "gpu.shared_memory_mib";

export function quotaInteger(value: string | undefined) {
  return value !== undefined && /^(0|[1-9]\d*)$/.test(value) ? BigInt(value) : undefined;
}

export function formatQuotaUnits(value: string | undefined, quotaCode?: GpuQuotaCode) {
  const amount = quotaInteger(value);
  if (amount === undefined) return "未知";
  if (quotaCode !== "gpu.shared_memory_mib") return amount.toLocaleString("zh-CN");
  const hundredths = (amount * 100n + 512n) / 1024n;
  return `${(hundredths / 100n).toLocaleString("zh-CN")}.${String(hundredths % 100n).padStart(2, "0")}`;
}
