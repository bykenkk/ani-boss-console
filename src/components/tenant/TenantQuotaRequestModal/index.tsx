import { Form, InputNumber, Modal } from "@arco-design/web-react";
import { useState } from "react";
import type { TenantQuotaItem } from "@/api/tenant";
import { showMessage } from "@/lib/feedback";

interface TenantQuotaRequestModalProps {
  loading: boolean;
  onCancel: () => void;

  item: TenantQuotaItem;
  onSubmit: (newValue: number) => void;
}

export function TenantQuotaRequestModal({
  item,
  loading,
  onCancel,
  onSubmit,
}: TenantQuotaRequestModalProps) {
  const [newValue, setNewValue] = useState(item.total);

  const submit = () => {
    if (!Number.isFinite(newValue) || newValue < item.used) {
      showMessage({
        type: "warning",
        content: `新上限不能低于当前用量 ${item.used} ${item.unit}`,
      });
      return;
    }
    onSubmit(newValue);
  };

  return (
    <Modal
      title={`配额调整：${item.displayName}`}
      visible
      okText="确认调整"
      confirmLoading={loading}
      onOk={submit}
      onCancel={onCancel}
    >
      <div className="mb-4 text-sm text-gray-500">确认后将直接调整配额，无需审批。</div>
      <Form layout="vertical">
        <Form.Item label={`新上限（${item.unit}）`} required>
          <InputNumber
            className="w-full"
            min={item.used}
            precision={0}
            value={newValue}
            onChange={(value) => setNewValue(Number(value) || 0)}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
