import { Form, Input, Modal, Select } from "@arco-design/web-react";
import { useState } from "react";
import type { AvailableTenantPlan, CreateTenantInput } from "@/api/tenant";
import { showMessage } from "@/lib/feedback";

interface TenantCreateModalProps {
  loading: boolean;
  plans: AvailableTenantPlan[];
  onCancel: () => void;
  onSubmit: (input: CreateTenantInput) => void;
}

const initialDraft: CreateTenantInput = {
  name: "",
  displayName: "",
  contactEmail: "",
  planId: "",
  administratorEmail: "",
  administratorName: "",
  administratorPassword: "",
};

export function TenantCreateModal({ loading, plans, onCancel, onSubmit }: TenantCreateModalProps) {
  const [draft, setDraft] = useState<CreateTenantInput>(() => ({
    ...initialDraft,
    planId: plans[0]?.id ?? "",
  }));

  const update = <Key extends keyof CreateTenantInput>(field: Key, value: CreateTenantInput[Key]) =>
    setDraft((current) => ({ ...current, [field]: value }));

  const submit = () => {
    const required = [
      draft.name,
      draft.displayName,
      draft.contactEmail,
      draft.planId,
      draft.administratorEmail,
      draft.administratorName,
      draft.administratorPassword,
    ];
    if (required.some((value) => !value.trim())) {
      showMessage({ type: "warning", content: "请完整填写租户与初始管理员信息" });
      return;
    }
    if (!draft.contactEmail.includes("@") || !draft.administratorEmail.includes("@")) {
      showMessage({ type: "warning", content: "请输入有效的联系邮箱和管理员邮箱" });
      return;
    }
    if (!/^[a-zA-Z0-9-]{3,40}$/.test(draft.name)) {
      showMessage({ type: "warning", content: "租户标识需为 3–40 位字母、数字或连字符" });
      return;
    }
    if (draft.administratorPassword.length < 8) {
      showMessage({ type: "warning", content: "管理员密码至少需要 8 位" });
      return;
    }
    onSubmit({
      ...draft,
      name: draft.name.trim(),
      displayName: draft.displayName.trim(),
      contactEmail: draft.contactEmail.trim(),
      administratorEmail: draft.administratorEmail.trim(),
      administratorName: draft.administratorName.trim(),
    });
  };

  return (
    <Modal
      title="开通租户"
      visible
      style={{ width: 720 }}
      okText="确认开通"
      confirmLoading={loading}
      onOk={submit}
      onCancel={onCancel}
    >
      <Form layout="vertical">
        <div className="grid grid-cols-2 gap-x-4">
          <Form.Item label="租户标识" required>
            <Input
              value={draft.name}
              placeholder="例如 acme-ai"
              onChange={(value) => update("name", value)}
            />
          </Form.Item>
          <Form.Item label="显示名" required>
            <Input
              value={draft.displayName}
              placeholder="企业或组织名称"
              onChange={(value) => update("displayName", value)}
            />
          </Form.Item>
        </div>
        <Form.Item label="联系邮箱" required>
          <Input
            value={draft.contactEmail}
            placeholder="contact@example.com"
            onChange={(value) => update("contactEmail", value)}
          />
        </Form.Item>
        <Form.Item label="配额套餐" required>
          <Select
            value={draft.planId || plans[0]?.id}
            options={plans.map((plan) => ({
              label: `${plan.name} · ${plan.code}`,
              value: plan.id,
            }))}
            onChange={(value) => update("planId", value)}
          />
        </Form.Item>
        <div className="grid grid-cols-2 gap-x-4">
          <Form.Item label="管理员姓名" required>
            <Input
              value={draft.administratorName}
              onChange={(value) => update("administratorName", value)}
            />
          </Form.Item>
          <Form.Item label="管理员邮箱" required>
            <Input
              value={draft.administratorEmail}
              placeholder="admin@example.com"
              onChange={(value) => update("administratorEmail", value)}
            />
          </Form.Item>
        </div>
        <Form.Item label="管理员初始密码" required>
          <Input.Password
            value={draft.administratorPassword}
            placeholder="8–64 位，至少包含三类字符"
            onChange={(value) => update("administratorPassword", value)}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
