import { Form, Input, Modal } from "@arco-design/web-react";
import { useState } from "react";
import type { UpdateTenantInput } from "@/api/tenant";
import { showMessage } from "@/lib/feedback";

interface TenantProfileModalProps {
  loading: boolean;
  onCancel: () => void;

  tenantId: string;
  displayName: string;
  contactEmail: string | null;
  onSubmit: (input: UpdateTenantInput) => void;
}

export function TenantProfileModal({
  tenantId,
  displayName,
  contactEmail,
  loading,
  onCancel,
  onSubmit,
}: TenantProfileModalProps) {
  const [draft, setDraft] = useState({ displayName, contactEmail: contactEmail ?? "" });

  const submit = () => {
    if (!draft.displayName.trim()) {
      showMessage({ type: "warning", content: "请填写租户显示名" });
      return;
    }
    if (draft.contactEmail && !draft.contactEmail.includes("@")) {
      showMessage({ type: "warning", content: "请输入有效的联系邮箱" });
      return;
    }
    onSubmit({
      tenantId,
      displayName: draft.displayName.trim(),
      contactEmail: draft.contactEmail.trim(),
    });
  };

  return (
    <Modal
      title="编辑租户信息"
      visible
      okText="保存"
      confirmLoading={loading}
      onOk={submit}
      onCancel={onCancel}
    >
      <Form layout="vertical">
        <Form.Item label="显示名" required>
          <Input
            value={draft.displayName}
            onChange={(displayName) => setDraft((current) => ({ ...current, displayName }))}
          />
        </Form.Item>
        <Form.Item label="联系邮箱">
          <Input
            value={draft.contactEmail}
            onChange={(nextContactEmail) =>
              setDraft((current) => ({ ...current, contactEmail: nextContactEmail }))
            }
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
