import { Form, Input, InputNumber, Modal } from "@arco-design/web-react";
import { useState } from "react";
import type { CreateTenantPlanInput, TenantPlanDetail, TenantQuotaMetaItem } from "@/api/tenant";
import { showMessage } from "@/lib/feedback";

interface TenantPlanModalProps {
  loading: boolean;
  onCancel: () => void;

  plan?: TenantPlanDetail;
  quotaMeta: TenantQuotaMetaItem[];
  onSubmit: (input: CreateTenantPlanInput | { name: string; description: string }) => void;
}

export function TenantPlanModal({
  plan,
  quotaMeta,
  loading,
  onCancel,
  onSubmit,
}: TenantPlanModalProps) {
  const [draft, setDraft] = useState({
    code: plan?.code ?? "",
    name: plan?.name ?? "",
    description: plan?.description ?? "",
    limits: Object.fromEntries(quotaMeta.map((item) => [item.resourceType, item.defaultQuota])),
  });

  const submit = () => {
    if (!draft.name.trim() || (!plan && !draft.code.trim())) {
      showMessage({ type: "warning", content: "请填写策略编码和名称" });
      return;
    }
    if (plan) {
      onSubmit({ name: draft.name.trim(), description: draft.description.trim() });
      return;
    }
    onSubmit({
      code: draft.code.trim(),
      name: draft.name.trim(),
      description: draft.description.trim(),
      quotaLimits: quotaMeta.map((item) => ({
        resourceType: item.resourceType,
        total: draft.limits[item.resourceType] ?? item.defaultQuota,
      })),
    });
  };

  return (
    <Modal
      title={plan ? "编辑配额策略" : "新建配额策略"}
      visible
      style={{ width: 720 }}
      okText={plan ? "保存" : "创建草稿"}
      confirmLoading={loading}
      onOk={submit}
      onCancel={onCancel}
    >
      <Form layout="vertical">
        <div className="grid grid-cols-2 gap-x-4">
          <Form.Item label="策略编码" required>
            <Input
              value={draft.code}
              disabled={Boolean(plan)}
              onChange={(code) => setDraft((current) => ({ ...current, code }))}
            />
          </Form.Item>
          <Form.Item label="策略名称" required>
            <Input
              value={draft.name}
              onChange={(name) => setDraft((current) => ({ ...current, name }))}
            />
          </Form.Item>
        </div>
        <Form.Item label="说明">
          <Input.TextArea
            value={draft.description}
            onChange={(description) => setDraft((current) => ({ ...current, description }))}
          />
        </Form.Item>
        {!plan ? (
          <div className="grid max-h-72 grid-cols-2 gap-x-4 overflow-auto">
            {quotaMeta.map((item) => (
              <Form.Item key={item.resourceType} label={`${item.displayName}（${item.unit}）`}>
                <InputNumber
                  className="w-full"
                  min={0}
                  precision={item.isDiscrete ? 0 : 2}
                  value={draft.limits[item.resourceType]}
                  onChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      limits: {
                        ...current.limits,
                        [item.resourceType]: Number(value) || 0,
                      },
                    }))
                  }
                />
              </Form.Item>
            ))}
          </div>
        ) : null}
      </Form>
    </Modal>
  );
}
