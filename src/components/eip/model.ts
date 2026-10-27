import type { EIP } from "@/api/eips";

export function eipReleaseBlockReason(item: EIP): string | undefined {
  if (item.managed_by !== "tenant" || item.scope !== "public")
    return "系统管理的地址由所属资源自动回收";
  if (item.binding_target || item.binding_state !== "unbound") return "请先解除 EIP 的资源绑定";
  if (["provisioning", "deleting", "deleted"].includes(item.state)) return "当前状态不可释放";
  return undefined;
}
export function eipBindingLabel(item: EIP): string {
  if (item.binding_target) {
    const labels: Record<string, string> = { vpc_snat: "VPC 出口", load_balancer: "负载均衡" };
    const kind = labels[item.binding_target.kind];
    return kind ?? item.binding_target.kind;
  }
  return item.binding_state === "unbound" ? "未绑定" : item.binding_state || "-";
}
