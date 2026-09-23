import { Form, Input, Modal } from "@arco-design/web-react";
import { useState } from "react";
import { showMessage } from "@/lib/feedback";

interface TenantAdministratorPasswordModalProps {
  loading: boolean;
  onCancel: () => void;
  onSubmit: (newPassword: string) => void;
}

export function TenantAdministratorPasswordModal({
  loading,
  onCancel,
  onSubmit,
}: TenantAdministratorPasswordModalProps) {
  const [password, setPassword] = useState("");

  const submit = () => {
    if (password.length < 8) {
      showMessage({ type: "warning", content: "新密码至少需要 8 位" });
      return;
    }
    onSubmit(password);
  };

  return (
    <Modal
      title="重置管理员密码"
      visible
      okText="确认重置"
      confirmLoading={loading}
      onOk={submit}
      onCancel={onCancel}
    >
      <Form layout="vertical">
        <Form.Item label="新密码" required>
          <Input.Password value={password} onChange={setPassword} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
