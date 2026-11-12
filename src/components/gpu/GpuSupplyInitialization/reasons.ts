const reasons: Record<string, string> = {
  INVENTORY_SCOPE_REQUIRED: "请先登记 GPU 目录集群，并将采集范围对齐目录 ID",
  GROUP_POLICY_REQUIRED: "请选择组策略",
  INVALID_GROUP_POLICY: "组策略字段组合不合法",
  GROUP_POLICY_SPEC_OVERRIDE: "规格由组策略生成，请移除手填规格字段",
  GROUP_POLICY_SPLIT_LIMIT: "等分份数超过插件实际槽数",
  GROUP_POLICY_MEMORY_TOO_SMALL: "每份显存不足一个插件显存块",
  GROUP_POLICY_MEMORY_INSUFFICIENT: "当前单卡有效预算不能容纳此策略",
  GROUP_POLICY_FACTS_UNKNOWN: "缺少判定此策略所需的静态事实",
  MEMORY_UNIT_MISMATCH: "显存单位无法按受支持协议编码",
  NATIVE_RESOURCE_SHAPE_AMBIGUOUS: "同一资源键对应多个无法区分的片型",
  RESOURCE_MAPPING_CONFIRMATION_REQUIRED: "需补充资源键映射确认及来源",
  FIXED_PARTITION_FACTS_REQUIRED: "缺少固定片的实际显存或计算单元",
  PHYSICAL_DEVICES_PARTITIONED: "父卡已有分区，不能再次作为整卡发布",
  NODE_GROUP_CONFLICT: "节点已被其他组接管",
  NODE_IDENTITY_CONFLICT: "节点身份已变化",
  DISCOVERY_REVISION_CONFLICT: "节点结构已变化，请刷新节点并重新预览",
  PROVIDER_CONFIG_VERSION_CONFLICT: "登记版本不匹配，请重新读取供给",
  REGISTERED_GROUP_POLICY_CHANGED: "冻结策略的执行条件已变化，恢复后可重试",
  ADAPTER_UNSUPPORTED: "该适配器或执行模式尚未开放",
  NVIDIA_VGPU_RESOURCE_REQUIRED: "NVIDIA 需要受支持的 Volcano vGPU 资源键",
};
export function supplyReasonText(reason: string) {
  return reasons[reason] ? `${reasons[reason]}（${reason}）` : reason;
}
