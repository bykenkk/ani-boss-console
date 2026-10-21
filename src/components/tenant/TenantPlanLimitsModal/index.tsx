import { Form, Modal } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { validateForm } from "@/lib/form";
import {
  updateTenantPlanQuotaLimits,
  tenantManagementQueryKeys,
  getTenantManagementErrorMessage,
  type TenantPlanQuotaLimit,
} from "@/api/tenant";
import { TenantPlanLimitFields } from "./TenantPlanLimitFields";
interface TenantPlanLimitsFormValues {
  limits: Record<string, number>;
}
interface TenantPlanLimitsModalProps {
  planId: string;
  limits: TenantPlanQuotaLimit[];
  onCancel: () => void;
  onSuccess: () => void;
}
export function TenantPlanLimitsModal({
  planId,
  limits,
  onCancel,
  onSuccess,
}: TenantPlanLimitsModalProps) {
  const [form] = Form.useForm<TenantPlanLimitsFormValues>();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "配额上限更新",
        successText: "配额上限已更新",
        errorFallback: "配额上限更新失败，请稍后重试",
      },
    },
    mutationFn: async (values: TenantPlanLimitsFormValues) => {
      try {
        return await updateTenantPlanQuotaLimits({
          planId,
          items: limits.map((item) => ({
            resourceType: item.resourceType,
            total: values.limits[item.resourceType],
          })),
        });
      } catch (error) {
        throw new Error(getTenantManagementErrorMessage(error));
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tenantManagementQueryKeys.all });
      onSuccess();
    },
  });
  return (
    <Modal
      visible
      okText="保存限额"
      title="编辑配额上限"
      style={{ width: 680 }}
      confirmLoading={mutation.isPending}
      cancelButtonProps={{ disabled: mutation.isPending }}
      onCancel={onCancel}
      onOk={async () => mutation.mutate(await validateForm(form))}
    >
      <Form form={form} layout="vertical">
        <TenantPlanLimitFields limits={limits} />
      </Form>
    </Modal>
  );
}
