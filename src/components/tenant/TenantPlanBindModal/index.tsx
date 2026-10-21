import { Form, Modal } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  bindTenantPlan,
  tenantManagementQueryKeys,
  getTenantManagementErrorMessage,
} from "@/api/tenant";
import { validateForm } from "@/lib/form";
import { TenantPlanBindingFields } from "./TenantPlanBindingFields";
interface TenantPlanBindModalProps {
  planId: string;
  onCancel: () => void;
  onSuccess: () => void;
}
interface TenantPlanBindingFormValues {
  tenantId: string;
}
export function TenantPlanBindModal({ planId, onCancel, onSuccess }: TenantPlanBindModalProps) {
  const [form] = Form.useForm<TenantPlanBindingFormValues>();
  const client = useQueryClient();
  const mutation = useMutation({
    meta: {
      feedback: { channel: "message", action: "配额策略绑定", successText: "租户配额策略已更新" },
    },
    mutationFn: async ({ tenantId }: TenantPlanBindingFormValues) => {
      try {
        return await bindTenantPlan(tenantId, planId);
      } catch (error) {
        throw new Error(getTenantManagementErrorMessage(error));
      }
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: tenantManagementQueryKeys.all });
      onSuccess();
    },
  });
  return (
    <Modal
      visible
      okText="确认绑定"
      title="绑定租户"
      confirmLoading={mutation.isPending}
      cancelButtonProps={{ disabled: mutation.isPending }}
      onCancel={onCancel}
      onOk={async () => mutation.mutate(await validateForm(form))}
    >
      <Form form={form} layout="vertical">
        <TenantPlanBindingFields planId={planId} />
      </Form>
    </Modal>
  );
}
