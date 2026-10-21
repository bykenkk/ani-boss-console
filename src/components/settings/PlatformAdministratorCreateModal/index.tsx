import { Form, Input, Modal } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createPlatformAdministrator,
  platformAdministratorQueryKeys,
  getPlatformAdministratorErrorMessage,
} from "@/api/platform-admins";
import { validateForm } from "@/lib/form";
import { PlatformAdministratorRoleFields } from "../PlatformAdministratorRoleFields";
import { PlatformAdministratorPasswordFields } from "../PlatformAdministratorPasswordFields";
interface PlatformAdministratorCreateModalProps {
  onCancel: () => void;
  onSuccess: () => void;
}
interface PlatformAdministratorCreateFormValues {
  email: string;
  username: string;
  displayName: string;
  roleId: string;
  password: string;
  confirmPassword: string;
}
export function PlatformAdministratorCreateModal({
  onCancel,
  onSuccess,
}: PlatformAdministratorCreateModalProps) {
  const [form] = Form.useForm<PlatformAdministratorCreateFormValues>();
  const client = useQueryClient();
  const mutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "平台运营账号创建",
        successText: "平台运营账号已创建",
        errorFallback: "平台运营账号创建失败，请稍后重试",
      },
    },
    mutationFn: async (values: PlatformAdministratorCreateFormValues) => {
      try {
        return await createPlatformAdministrator({
          email: values.email,
          username: values.username,
          displayName: values.displayName,
          roleId: values.roleId,
          password: values.password,
        });
      } catch (error) {
        throw new Error(getPlatformAdministratorErrorMessage(error));
      }
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: platformAdministratorQueryKeys.all });
      onSuccess();
    },
  });
  return (
    <Modal
      visible
      title="新建平台运营账号"
      confirmLoading={mutation.isPending}
      cancelButtonProps={{ disabled: mutation.isPending }}
      onCancel={onCancel}
      onOk={async () => mutation.mutate(await validateForm(form))}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="邮箱"
          field="email"
          rules={[{ required: true, type: "email", message: "请输入有效邮箱" }]}
        >
          <Input placeholder="name@example.com" autoComplete="off" />
        </Form.Item>
        <Form.Item
          label="用户名"
          field="username"
          rules={[
            { required: true, message: "请输入用户名" },
            { maxLength: 64, message: "用户名最多 64 个字符" },
            { match: /^[^:]+$/, message: "用户名不能包含冒号" },
          ]}
        >
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item
          label="显示名称"
          field="displayName"
          rules={[
            { required: true, message: "请输入显示名称" },
            { maxLength: 128, message: "显示名称最多 128 个字符" },
          ]}
        >
          <Input />
        </Form.Item>
        <PlatformAdministratorRoleFields />
        <PlatformAdministratorPasswordFields form={form} creating />
      </Form>
    </Modal>
  );
}
