import type { GpuAllocationType, GpuMode, GpuProfileSpec } from "@/api/accelerator";

export const gpuAllocationLabels: Record<GpuAllocationType, string> = {
  PHYSICAL: "整卡",
  DYNAMIC_SHARED: "动态共享",
  FIXED_PARTITION: "固定分区",
};

export const gpuModeLabels: Record<GpuMode, string> = {
  WHOLE_EXCLUSIVE: "整卡",
  SHARED_FIXED: "共享",
};

// Keep authoritative decimal strings exact, and distinguish a known zero.
export function displayGpuValue(value: string | number | null | undefined): string {
  return value === null || value === undefined || value === "" ? "-" : String(value);
}

type GpuSpecParameter = "memory_mib_per_device" | "core_limit_percent" | "compute_units_per_device";

type GpuSpecification = Pick<GpuProfileSpec, "allocation_type" | GpuSpecParameter>;

// Static zero parameters can mean "not applicable"; capacity measurements use
// their own nullable contract, where a known zero must remain visible.
export function displayGpuSpecValue(
  spec: GpuSpecification | undefined,
  parameter: GpuSpecParameter,
): string {
  if (!spec) return "-";
  const value = spec[parameter];
  if (parameter === "compute_units_per_device" && spec.allocation_type !== "FIXED_PARTITION")
    return "-";
  if (parameter === "core_limit_percent" && value === 0) return "-";
  if (parameter === "memory_mib_per_device" && spec.allocation_type === "PHYSICAL" && value === "0")
    return "-";
  return displayGpuValue(value);
}
