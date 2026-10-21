import { Form, Input, Modal } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { validateForm } from "@/lib/form";
import {
  resetTenantAdministratorPassword,
  tenantManagementQueryKeys,
  getTenantManagementErrorMessage,
} from "@/api/tenant";
interface TenantAdministratorPasswordFormValues {
  newPassword: string;
}
interface TenantAdministratorPasswordModalProps {
  tenantId: string;
  administratorId: string;
  onCancel: () => void;
  onSuccess: () => void;
}
export function TenantAdministratorPasswordModal({
  tenantId,
  administratorId,
  onCancel,
  onSuccess,
}: TenantAdministratorPasswordModalProps) {
  const [form] = Form.useForm<TenantAdministratorPasswordFormValues>();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "管理员密码重置",
        successText: "管理员密码已重置",
        errorFallback: "管理员密码重置失败，请稍后重试",
      },
    },
    mutationFn: async (values: TenantAdministratorPasswordFormValues) => {
      try {
        return await resetTenantAdministratorPassword({
          tenantId,
          userId: administratorId,
          newPassword: values.newPassword,
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
      okText="确认重置"
      title="重置管理员密码"
      confirmLoading={mutation.isPending}
      cancelButtonProps={{ disabled: mutation.isPending }}
      onCancel={onCancel}
      onOk={async () => mutation.mutate(await validateForm(form))}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="新密码"
          field="newPassword"
          rules={[
            { required: true, message: "请输入新密码" },
            { minLength: 8, message: "新密码至少需要 8 位" },
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
