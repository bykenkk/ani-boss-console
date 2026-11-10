import { Cascader } from "@arco-design/web-react";
import type { ComputePresetListParams } from "@/api/compute-presets";

interface ComputePresetTypeFilterProps {
  computeType?: ComputePresetListParams["compute_type"];
  gpuMode?: ComputePresetListParams["gpu_mode"];
  onChange: (
    computeType: ComputePresetListParams["compute_type"],
    gpuMode: ComputePresetListParams["gpu_mode"],
  ) => void;
}

export function ComputePresetTypeFilter({
  computeType,
  gpuMode,
  onChange,
}: ComputePresetTypeFilterProps) {
  const value = computeType
    ? computeType === "gpu"
      ? [computeType, gpuMode ?? "all"]
      : [computeType]
    : undefined;

  return (
    <Cascader
      aria-label="规格类型 / GPU 模式"
      placeholder="全部类型 / GPU 模式"
      allowClear
      expandTrigger="hover"
      value={value}
      options={[
        { label: "全部类型", value: "all" },
        { label: "CPU", value: "cpu" },
        {
          label: "GPU",
          value: "gpu",
          children: [
            { label: "全部模式", value: "all" },
            { label: "整卡", value: "WHOLE_EXCLUSIVE" },
            { label: "共享", value: "SHARED_FIXED" },
          ],
        },
      ]}
      onChange={(path) => {
        const [type, mode] = path ?? [];
        onChange(
          type === "cpu" || type === "gpu" ? type : undefined,
          type === "gpu" && (mode === "WHOLE_EXCLUSIVE" || mode === "SHARED_FIXED")
            ? mode
            : undefined,
        );
      }}
    />
  );
}
