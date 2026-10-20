import type { PageParams } from "@/api/types";
import type { GpuMode } from "@/api/accelerator";
export interface ComputeGpuReference {
  profile_id: string;
  profile_version: string;
  devices_per_instance: number;
}
export interface ComputeGpuSummary extends ComputeGpuReference {
  mode: GpuMode;
  model_key: string;
  memory_mib_per_device: string;
  memory_mib_total: string;
  core_limit_percent: number;
}
export interface ComputePresetInput {
  code: string;
  name: string;
  description: string;
  compute_type: "cpu" | "gpu";
  cpu_millis: string;
  memory_mib: string;
  enabled: boolean;
  gpu?: ComputeGpuReference | null;
}
export interface ComputePreset extends Omit<ComputePresetInput, "gpu"> {
  id: string;
  gpu?: ComputeGpuSummary;
  created_at?: string;
  updated_at?: string;
  selectable?: boolean;
  unavailable_reason?: string;
}
export interface ComputePresetListParams extends PageParams {
  name?: string;
  code?: string;
  compute_type?: "cpu" | "gpu";
  gpu_mode?: GpuMode;
  enabled?: boolean;
}
export interface ComputePresetList {
  items: ComputePreset[];
  total: string;
}
export type ComputePresetChanges = Partial<Omit<ComputePresetInput, "code">>;
