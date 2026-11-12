import { ApiError } from "@/api/request";

const reasons: Record<string, string> = {
  PROVIDER_CONFIG_REQUIRED: "缺少供给配置",
  NODE_MODEL_REQUIRED: "缺少节点型号",
  MANAGED_CONNECTION_REQUIRED: "缺少集群连接配置",
  INVENTORY_UNAVAILABLE: "设备观测暂不可用",
  NODE_DELETING: "节点正在删除",
  NODE_ALREADY_ADOPTED: "节点已纳管",
  NODE_LABEL_CONFLICT: "节点归属标签冲突",
  NODE_MODEL_INVALID: "节点型号格式不正确",
  NODE_MODEL_CONFLICT: "节点型号与设备观测不一致",
  NVIDIA_UNITS_UNKNOWN: "插件计量单位待核实",
  PHYSICAL_DEVICES_PARTITIONED: "设备已切分，整卡供给不可用",
  REGISTERED_MODE_UNVERIFIED: "已登记供给模式待核实",
  REGISTERED_RESOURCE_TYPE_CHANGED: "固定片实际容量或 CU 已变化",
  REGISTERED_NVIDIA_UNITS_CHANGED: "插件计量单位已变化",
  CONFIGURATION_REQUIRED: "供给配置尚未就绪",
  DISCOVERY_REVISION_CONFLICT: "发现信息已变化，请刷新后重新核对",
  BASELINE_UNAVAILABLE: "所选供给配置不可用，请刷新后重新选择",
  SHAPE_UNSUPPORTED: "规格参数不满足已登记供给的约束",
  INVALID_INITIALIZATION_GRAPH: "初始化参数不符合后端约束",
  IDEMPOTENCY_CONFLICT: "重试内容与原始提交不一致",
  VERSION_CONFLICT: "记录版本已变化，请刷新后重新核对",
  RESOURCE_TYPE_MISMATCH: "固定片显存或 CU 与已登记类型不一致",
  DEVICE_MEMORY_MISMATCH: "显存与已登记设备类型不一致",
  NODE_MEMBERSHIP_CONFLICT: "节点的供给组归属已变化",
};

export function formatGpuInitializationReason(reason: string) {
  return reasons[reason] ?? reason;
}

export function formatGpuInitializationError(error: Error): string {
  if (!(error instanceof ApiError)) return error.message;
  const explanation = error.reason ? reasons[error.reason] : undefined;
  return [
    error.message,
    error.reason && error.reason !== error.message
      ? explanation
        ? `${explanation}（${error.reason}）`
        : error.reason
      : "",
    error.requestId ? `请求 ID：${error.requestId}` : "",
  ]
    .filter(Boolean)
    .join("；");
}
