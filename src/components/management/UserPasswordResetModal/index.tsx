import { Form, Input, Modal } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import { resetManagementPassword, type ManagedUser } from "@/api/management";
import { validateForm } from "@/lib/form";
export function UserPasswordResetModal({
  user,
  onCancel,
}: {
  user: ManagedUser;
  onCancel: () => void;
}) {
  const [form] = Form.useForm<{ password: string; confirmation: string }>();
  const mutation = useMutation({
    mutationFn: (password: string) => resetManagementPassword(user.id, password),
    meta: { feedback: { channel: "message", action: "重置用户密码" } },
    onSuccess: onCancel,
  });
  const submit = async () => {
    if (mutation.isPending) return;
    try {
      const values = await validateForm<{ password: string; confirmation: string }>(form);
      mutation.mutate(values.password);
    } catch {
      /* 校验已反馈 */
    }
  };
  return (
    <Modal
      visible
      title={`重置密码：${user.username}`}
      onCancel={onCancel}
      onOk={submit}
      confirmLoading={mutation.isPending}
      cancelButtonProps={{ disabled: mutation.isPending }}
    >
      <p>保存后该用户需要重新登录。</p>
      <Form form={form} layout="vertical">
        <Form.Item
          field="password"
          label="新密码"
          rules={[{ required: true, message: "请输入新密码" }]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          field="confirmation"
          label="确认新密码"
          rules={[
            { required: true, message: "请再次输入新密码" },
            {
              validator: (value, callback) => {
                if (value !== form.getFieldValue("password")) callback("两次密码不一致");
                else callback();
              },
            },
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
