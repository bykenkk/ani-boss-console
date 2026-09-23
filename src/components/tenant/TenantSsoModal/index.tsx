import { Form, Input, Modal, Select } from "@arco-design/web-react";
import { useState } from "react";
import { showMessage } from "@/lib/feedback";

interface TenantSsoModalProps {
  loading: boolean;
  onCancel: () => void;

  enabled: boolean;
  provider: string | null;
  onSubmit: (input: { ssoEnabled: boolean; provider?: string }) => void;
}

export function TenantSsoModal({
  enabled,
  provider,
  loading,
  onCancel,
  onSubmit,
}: TenantSsoModalProps) {
  const [draft, setDraft] = useState({ ssoEnabled: enabled, provider: provider ?? "" });

  const submit = () => {
    if (draft.ssoEnabled && !draft.provider.trim()) {
      showMessage({ type: "warning", content: "启用 SSO 时需要填写身份提供商" });
      return;
    }
    onSubmit({
      ssoEnabled: draft.ssoEnabled,
      provider: draft.ssoEnabled ? draft.provider.trim() : undefined,
    });
  };

  return (
    <Modal
      title="配置单点登录"
      visible
      okText="保存配置"
      confirmLoading={loading}
      onOk={submit}
      onCancel={onCancel}
    >
      <Form layout="vertical">
        <Form.Item label="SSO 状态" required>
          <Select
            value={draft.ssoEnabled ? "enabled" : "disabled"}
            options={[
              { label: "启用", value: "enabled" },
              { label: "停用", value: "disabled" },
            ]}
            onChange={(value) =>
              setDraft((current) => ({ ...current, ssoEnabled: value === "enabled" }))
            }
          />
        </Form.Item>
        {draft.ssoEnabled ? (
          <Form.Item label="身份提供商" required>
            <Input
              value={draft.provider}
              placeholder="例如 oidc、saml"
              onChange={(nextProvider) =>
                setDraft((current) => ({ ...current, provider: nextProvider }))
              }
            />
          </Form.Item>
        ) : null}
      </Form>
    </Modal>
  );
}
