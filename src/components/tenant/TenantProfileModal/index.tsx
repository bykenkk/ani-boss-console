import { Form, Input, Modal } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { validateForm } from "@/lib/form";
import {
  updateTenant,
  tenantManagementQueryKeys,
  getTenantManagementErrorMessage,
} from "@/api/tenant";
interface TenantProfileFormValues {
  displayName: string;
  contactEmail: string;
}
interface TenantProfileModalProps {
  tenantId: string;
  displayName: string;
  contactEmail: string | null;
  onCancel: () => void;
  onSuccess: () => void;
}
export function TenantProfileModal({
  tenantId,
  displayName,
  contactEmail,
  onCancel,
  onSuccess,
}: TenantProfileModalProps) {
  const [form] = Form.useForm<TenantProfileFormValues>();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "租户信息更新",
        successText: "租户信息已更新",
        errorFallback: "租户信息更新失败，请稍后重试",
      },
    },
    mutationFn: async (values: TenantProfileFormValues) => {
      try {
        return await updateTenant({
          tenantId,
          displayName: values.displayName.trim(),
          contactEmail: (values.contactEmail ?? "").trim(),
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
      title="编辑租户信息"
      confirmLoading={mutation.isPending}
      cancelButtonProps={{ disabled: mutation.isPending }}
      onCancel={onCancel}
      onOk={async () => mutation.mutate(await validateForm(form))}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ displayName, contactEmail: contactEmail ?? "" }}
      >
        <Form.Item
          label="显示名"
          field="displayName"
          rules={[{ required: true, match: /\S/, message: "请填写租户显示名" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="联系邮箱"
          field="contactEmail"
          rules={[{ type: "email", message: "请输入有效的联系邮箱" }]}
        >
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
}
