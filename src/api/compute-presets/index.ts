import { adminRequest } from "@/api/request";
import { listGpuProfiles } from "@/api/accelerator";
import type {
  ComputePresetChanges,
  ComputePresetInput,
  ComputePresetList,
  ComputePresetListParams,
} from "./types";
export * from "./types";
export const computePresetKeys = { all: ["compute-presets"] as const };
export function listComputePresets(
  params: ComputePresetListParams,
  signal?: AbortSignal,
): Promise<ComputePresetList> {
  return adminRequest("/compute-presets", { params, signal });
}
// Preset CRUD 按当前 Governance 契约使用 data，无幂等 key 或版本锁字段。
export async function createComputePreset(input: ComputePresetInput): Promise<void> {
  await adminRequest("/compute-presets", { method: "POST", data: { data: input } });
}
export async function updateComputePreset({
  id,
  changes,
}: {
  id: string;
  changes: ComputePresetChanges;
}): Promise<void> {
  const fields: Record<keyof ComputePresetChanges, string> = {
    name: "name",
    description: "description",
    compute_type: "computeType",
    cpu_millis: "cpuMillis",
    memory_mib: "memoryMib",
    enabled: "enabled",
    gpu: "gpu",
  };
  const update_mask = (Object.keys(changes) as (keyof ComputePresetChanges)[])
    .map((key) => fields[key])
    .join(",");
  await adminRequest("/compute-presets/" + encodeURIComponent(id), {
    method: "PATCH",
    data: { data: changes, update_mask },
  });
}
export async function setComputePresetEnabled({
  id,
  enabled,
}: {
  id: string;
  enabled: boolean;
}): Promise<void> {
  await adminRequest("/compute-presets/" + encodeURIComponent(id) + ":set-enabled", {
    method: "POST",
    data: { data: { enabled } },
  });
}
export async function deleteComputePreset(id: string): Promise<void> {
  await adminRequest("/compute-presets/" + encodeURIComponent(id), { method: "DELETE" });
}
// TODO(pagination-migration): GPU 规格选项暂取所选集群首 100 项；后端提供页码分页接口后迁移，不遍历分页或本地筛选目录。
export function listComputeGpuProfileOptions(cluster_id: string, signal?: AbortSignal) {
  return listGpuProfiles({ cluster_id, page_size: 100 }, signal);
}
