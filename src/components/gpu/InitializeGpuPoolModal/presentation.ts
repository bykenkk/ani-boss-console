const reasons: Record<string, string> = {
  PROVIDER_CONFIG_REQUIRED: "缺少供给配置",
  NODE_MODEL_REQUIRED: "缺少节点型号",
};

export function formatGpuInitializationReason(reason: string) {
  return reasons[reason] ?? reason;
}
