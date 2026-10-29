import { Modal, Typography } from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deletePlan, getPlanBoundTenantCount, planKeys, type Plan } from "@/api/plans";
import { withId } from "@/lib/id";

interface PlanDeleteModalProps {
  plan: Plan;
  onCancel: () => void;
  onSuccess: () => void;
}

export function PlanDeleteModal({ plan, onCancel, onSuccess }: PlanDeleteModalProps) {
  const client = useQueryClient();
  const count = useQuery({
    queryKey: planKeys.boundTenantCount(plan.id),
    queryFn: ({ signal }) => getPlanBoundTenantCount(plan.id, signal),
    meta: {
      errorNotification: { id: withId("plan-bound-tenants", plan.id), action: "绑定租户数量加载" },
    },
  });
  const removal = useMutation({
    mutationFn: () => deletePlan(plan.id),
    meta: {
      feedback: { channel: "notification", id: withId("plan-delete", plan.id), action: "删除套餐" },
    },
    onSuccess: async () => {
      onSuccess();
      await client.invalidateQueries({ queryKey: planKeys.all });
    },
  });
  const canDelete = count.isSuccess && count.data === "0";
  return (
    <Modal
      visible
      title="删除套餐"
      okText="删除"
      onCancel={onCancel}
      onOk={() => {
        if (canDelete && !count.isFetching && !removal.isPending) removal.mutate();
      }}
      okButtonProps={{ status: "danger", disabled: !canDelete || count.isFetching }}
      confirmLoading={removal.isPending}
      cancelButtonProps={{ disabled: removal.isPending }}
      closable={!removal.isPending}
      escToExit={!removal.isPending}
    >
      <Typography.Paragraph>
        套餐“{plan.name ?? plan.id}”已被 {count.data ?? "-"} 个租户使用。
      </Typography.Paragraph>
      <Typography.Paragraph>
        {count.isPending
          ? "正在核对绑定租户数量。"
          : canDelete
            ? "确认删除此套餐？删除后无法在页面撤销。"
            : "仅允许删除没有绑定租户的套餐。"}
      </Typography.Paragraph>
    </Modal>
  );
}
