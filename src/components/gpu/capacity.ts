import type {
  GpuAllocationType,
  GpuCapacityBasis,
  GpuCapacityGranularity,
} from "@/api/accelerator";

export function formatGpuAllocationType(value?: GpuAllocationType) {
  if (!value) return "-";
  return (
    {
      PHYSICAL: "整卡",
      DYNAMIC_SHARED: "动态共享",
      FIXED_PARTITION: "固定切片",
    }[value] ?? value
  );
}

export function formatGpuCapacityBasis(value?: GpuCapacityBasis) {
  if (!value) return "-";
  return (
    {
      NATIVE_ALLOCATION: "原生分配数据",
      BOUND_POD_REQUEST: "已绑定工作负载请求",
    }[value] ?? value
  );
}

export function formatGpuCapacityGranularity(value?: GpuCapacityGranularity) {
  if (!value) return "-";
  return { DEVICE: "逐卡", NODE_RESOURCE: "节点资源类型" }[value] ?? value;
}
