import { Form, Input, Modal, Select } from "@arco-design/web-react";
import { useState } from "react";
import type { InviteTenantAdministratorInput } from "@/api/tenant";
import { showMessage } from "@/lib/feedback";

interface TenantAdministratorInviteModalProps {
  loading: boolean;
  onCancel: () => void;

  tenantId?: string;
  tenantOptions: Array<{ id: string; name: string; displayName: string | null }>;
  onSubmit: (input: InviteTenantAdministratorInput) => void;
}

export function TenantAdministratorInviteModal({
  tenantId,
  tenantOptions,
  loading,
  onCancel,
  onSubmit,
}: TenantAdministratorInviteModalProps) {
  const [draft, setDraft] = useState({
    tenantId: tenantId ?? tenantOptions[0]?.id ?? "",
    email: "",
    username: "",
  });

  const submit = () => {
    if (!draft.tenantId || !draft.email.includes("@") || !draft.username.trim()) {
      showMessage({ type: "warning", content: "请选择租户并填写有效的邮箱和用户名" });
      return;
    }
    onSubmit({
      tenantId: draft.tenantId,
      email: draft.email.trim(),
      username: draft.username.trim(),
    });
  };

  return (
    <Modal
      title="邀请租户管理员"
      visible
      okText="发送邀请"
      confirmLoading={loading}
      onOk={submit}
      onCancel={onCancel}
    >
      <Form layout="vertical">
        <Form.Item label="租户" required>
          <Select
            disabled={Boolean(tenantId)}
            value={draft.tenantId}
            options={tenantOptions.map((tenant) => ({
              label: `${tenant.displayName || tenant.name} · ${tenant.name}`,
              value: tenant.id,
            }))}
            onChange={(nextTenantId) =>
              setDraft((current) => ({ ...current, tenantId: nextTenantId }))
            }
          />
        </Form.Item>
        <Form.Item label="用户名" required>
          <Input
            value={draft.username}
            onChange={(username) => setDraft((current) => ({ ...current, username }))}
          />
        </Form.Item>
        <Form.Item label="邮箱" required>
          <Input
            value={draft.email}
            onChange={(email) => setDraft((current) => ({ ...current, email }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
