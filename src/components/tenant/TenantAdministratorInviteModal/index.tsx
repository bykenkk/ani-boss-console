import { Form, Input, Modal } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { validateForm } from "@/lib/form";
import {
  inviteTenantAdministrator,
  tenantManagementQueryKeys,
  getTenantManagementErrorMessage,
} from "@/api/tenant";
interface TenantAdministratorInvitationFormValues {
  email: string;
  username: string;
}
interface TenantAdministratorInviteModalProps {
  tenantId: string;
  tenantName: string;
  onCancel: () => void;
  onSuccess: () => void;
}
export function TenantAdministratorInviteModal({
  tenantId,
  tenantName,
  onCancel,
  onSuccess,
}: TenantAdministratorInviteModalProps) {
  const [form] = Form.useForm<TenantAdministratorInvitationFormValues>();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "租户管理员邀请",
        successText: "管理员邀请已发送",
        errorFallback: "租户管理员邀请失败，请稍后重试",
      },
    },
    mutationFn: async (values: TenantAdministratorInvitationFormValues) => {
      try {
        return await inviteTenantAdministrator({
          tenantId,
          email: values.email.trim(),
          username: values.username.trim(),
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
      okText="发送邀请"
      title="邀请租户管理员"
      confirmLoading={mutation.isPending}
      cancelButtonProps={{ disabled: mutation.isPending }}
      onCancel={onCancel}
      onOk={async () => mutation.mutate(await validateForm(form))}
    >
      <Form form={form} layout="vertical">
        <Form.Item label="租户">
          <Input value={tenantName} disabled />
        </Form.Item>
        <Form.Item
          label="用户名"
          field="username"
          rules={[{ required: true, match: /\S/, message: "请输入用户名" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="邮箱"
          field="email"
          rules={[{ required: true, type: "email", message: "请输入有效的邮箱" }]}
        >
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
}
