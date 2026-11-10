import { ResourceIdentity } from "@/components/common";
import { Descriptions } from "@arco-design/web-react";
import type { ComputePresetInput } from "@/api/compute-presets";
import type { ComputeGpuSummary } from "@/api/compute-presets";
import type { GpuProfile } from "@/api/accelerator";
import { displayGpuSpecValue, displayGpuValue, gpuAllocationLabels } from "./gpu";

interface ComputePresetSummaryProps {
  values: ComputePresetInput;
  profile?: GpuProfile;
  existingGpu?: ComputeGpuSummary;
}

export function ComputePresetSummary({ values, profile, existingGpu }: ComputePresetSummaryProps) {
  const spec = profile?.spec ?? existingGpu;
  return (
    <Descriptions
      column={1}
      className="break-all"
      data={[
        { label: "规格名称", value: values.name },
        { label: "规格编码", value: values.code },
        { label: "描述", value: values.description || "-" },
        { label: "启用", value: values.enabled ? "是" : "否" },
        { label: "规格类型", value: values.compute_type.toUpperCase() },
        { label: "CPU", value: values.cpu_millis + " 毫核" },
        { label: "内存", value: values.memory_mib + " MiB" },
        ...(values.compute_type === "gpu" && values.gpu
          ? [
              {
                label: "GPU 规格 ID",
                value: (
                  <ResourceIdentity id={values.gpu.profile_id} display="id" idLabel="GPU 规格 ID" />
                ),
              },
              { label: "GPU 规格版本", value: values.gpu.profile_version },
              { label: "每实例设备 / 分片数量", value: String(values.gpu.devices_per_instance) },
              {
                label: "资源类型",
                value: spec ? (gpuAllocationLabels[spec.allocation_type] ?? "-") : "-",
              },
              { label: "GPU 型号", value: displayGpuValue(spec?.model_key) },
              {
                label: "每单位显存（MiB）",
                value: displayGpuSpecValue(spec, "memory_mib_per_device"),
              },
              {
                label: "每单位算力（CU）",
                value: displayGpuSpecValue(spec, "compute_units_per_device"),
              },
              { label: "核心比例（%）", value: displayGpuSpecValue(spec, "core_limit_percent") },
              { label: "资源键", value: displayGpuValue(spec?.resource_key) },
              ...(!profile && existingGpu
                ? [
                    { label: "适配器", value: displayGpuValue(existingGpu.adapter_id) },
                    { label: "规格摘要", value: displayGpuValue(existingGpu.spec_digest) },
                  ]
                : []),
            ]
          : []),
      ]}
    />
  );
}
