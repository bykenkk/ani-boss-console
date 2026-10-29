import { Descriptions } from "@arco-design/web-react";
import type { ComputePresetInput } from "@/api/compute-presets";

export function ComputePresetSummary({ values }: { values: ComputePresetInput }) {
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
              { label: "GPU 规格 ID", value: values.gpu.profile_id },
              { label: "GPU 规格版本", value: values.gpu.profile_version },
              { label: "每实例 GPU 数量", value: String(values.gpu.devices_per_instance) },
            ]
          : []),
      ]}
    />
  );
}
