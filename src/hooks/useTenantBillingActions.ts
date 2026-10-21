import { useTenantManagement } from "./useTenantManagement";
import type { TenantBillingAction } from "@/stores/tenant-management";
import { showNotification } from "@/lib/feedback";
import { withId } from "@/lib/id";

const actionLabels: Record<Exclude<TenantBillingAction, "adjust_credit">, string> = {
  refresh_usage: "刷新用量",
  generate_invoice: "生成账单",
  mark_settled: "标记结清",
  export_statement: "导出对账单",
};
export function useTenantBillingActions() {
  const { applyTenantBillingAction } = useTenantManagement();
  return (tenantId: string, action: Exclude<TenantBillingAction, "adjust_credit">) => {
    const id = withId("tenant-billing", action, tenantId);
    const label = actionLabels[action];
    showNotification({ id, state: "loading", action: label });
    try {
      const result = applyTenantBillingAction(tenantId, action);
      showNotification({
        id,
        state: result.ok ? "success" : "error",
        action: label,
        title: result.ok ? (result.message ?? label + "成功") : undefined,
        content: result.ok ? undefined : (result.reason ?? label + "失败"),
      });
      return result.ok;
    } catch (error) {
      showNotification({
        id,
        state: "error",
        action: label,
        content: { error, fallback: label + "失败" },
      });
      return false;
    }
  };
}
