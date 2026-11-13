import { Modal } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteManagement, managementKeys, type ManagedTenant } from "@/api/management";
import type { RowAction } from "@/components/common";
import { withId } from "@/lib/id";

interface UseTenantActionsOptions {
  onEdit: (tenant: ManagedTenant) => void;
  onDeleted?: (tenant: ManagedTenant) => void | Promise<void>;
}

export function useTenantActions({ onEdit, onDeleted }: UseTenantActionsOptions) {
  const client = useQueryClient();
  const removal = useMutation({
    mutationFn: (tenant: ManagedTenant) => deleteManagement("tenants", tenant.id),
    meta: {
      feedback: {
        channel: "notification",
        id: withId("management-delete", "tenants"),
        action: "删除租户",
      },
    },
    onSuccess: async (_, tenant) => {
      const detailKey = managementKeys.detail("tenants", tenant.id);
      await client.cancelQueries({ queryKey: detailKey, exact: true });
      // 详情入口先完成返回列表，再移除已删除资源的缓存，避免重新请求该详情。
      await onDeleted?.(tenant);
      client.removeQueries({ queryKey: detailKey, exact: true });
      await client.invalidateQueries({ queryKey: managementKeys.all });
    },
  });

  const actions: RowAction<ManagedTenant>[] = [
    { key: "edit", label: "编辑", disabled: () => removal.isPending, onClick: onEdit },
    {
      key: "delete",
      label: "删除",
      intent: "danger",
      disabled: () => removal.isPending,
      loading: (tenant) => removal.isPending && removal.variables?.id === tenant.id,
      onClick: (tenant) => {
        if (removal.isPending) return;
        Modal.confirm({
          title: "删除租户",
          content: `确认删除“${tenant.name ?? tenant.id}”？关联配置可能受影响，此操作无法在页面撤销。`,
          okButtonProps: { status: "danger" },
          onOk: () => removal.mutateAsync(tenant),
        });
      },
    },
  ];
  return { actions };
}
