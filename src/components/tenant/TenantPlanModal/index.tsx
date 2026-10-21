import { Form, Input, Modal } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { validateForm } from "@/lib/form";
import {
  updateTenantPlan,
  tenantManagementQueryKeys,
  getTenantManagementErrorMessage,
  type TenantPlanDetail,
} from "@/api/tenant";
interface TenantPlanEditFormValues {
  name: string;
  description: string;
}
interface TenantPlanModalProps {
  plan: TenantPlanDetail;
  onCancel: () => void;
  onSuccess: () => void;
}
export function TenantPlanModal({ plan, onCancel, onSuccess }: TenantPlanModalProps) {
  const [form] = Form.useForm<TenantPlanEditFormValues>();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "配额策略更新",
        successText: "配额策略已更新",
        errorFallback: "配额策略更新失败，请稍后重试",
      },
    },
    mutationFn: async (values: TenantPlanEditFormValues) => {
      try {
        return await updateTenantPlan({
          planId: plan.id,
          name: values.name.trim(),
          description: (values.description ?? "").trim(),
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
      okText="保存"
      title="编辑配额策略"
      style={{ width: 720 }}
      confirmLoading={mutation.isPending}
      cancelButtonProps={{ disabled: mutation.isPending }}
      onCancel={onCancel}
      onOk={async () => mutation.mutate(await validateForm(form))}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ name: plan.name, description: plan.description ?? "" }}
      >
        <Form.Item label="策略编码">
          <Input value={plan.code} disabled />
        </Form.Item>
        <Form.Item
          label="策略名称"
          field="name"
          rules={[{ required: true, match: /\S/, message: "请填写策略名称" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item label="说明" field="description">
          <Input.TextArea />
        </Form.Item>
      </Form>
    </Modal>
  );
}
