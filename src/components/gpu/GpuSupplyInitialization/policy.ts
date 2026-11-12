import type { SupplyGroupPolicy } from "@/api/accelerator";
export function policyLabel(policy: SupplyGroupPolicy) {
  if (policy.policy_kind === "WHOLE") return "整卡";
  if (policy.policy_kind === "EQUAL_SHARE") return `${policy.parts} 等分`;
  return `${policy.native_allocation_type === "PHYSICAL" ? "原生整卡" : "原生固定片"} · ${policy.resource_key}`;
}
