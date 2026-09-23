import { Form, InputNumber, Modal } from "@arco-design/web-react";
import { useState } from "react";
import type { TenantPlanQuotaLimit } from "@/api/tenant";

interface TenantPlanLimitsModalProps {
  loading: boolean;
  onCancel: () => void;

  limits: TenantPlanQuotaLimit[];
  onSubmit: (items: Array<{ resourceType: string; total: number }>) => void;
}

export function TenantPlanLimitsModal({
  limits,
  loading,
  onCancel,
  onSubmit,
}: TenantPlanLimitsModalProps) {
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(limits.map((item) => [item.resourceType, item.total])),
  );

  return (
    <Modal
      title="编辑配额上限"
      visible
      style={{ width: 680 }}
      okText="保存限额"
      confirmLoading={loading}
      onOk={() =>
        onSubmit(
          limits.map((item) => ({
            resourceType: item.resourceType,
            total: values[item.resourceType] ?? item.total,
          })),
        )
      }
      onCancel={onCancel}
    >
      <Form layout="vertical">
        <div className="grid grid-cols-2 gap-x-4">
          {limits.map((item) => (
            <Form.Item key={item.resourceType} label={`${item.displayName}（${item.unit}）`}>
              <InputNumber
                className="w-full"
                min={0}
                precision={0}
                value={values[item.resourceType]}
                onChange={(value) =>
                  setValues((current) => ({
                    ...current,
                    [item.resourceType]: Number(value) || 0,
                  }))
                }
              />
            </Form.Item>
          ))}
        </div>
      </Form>
    </Modal>
  );
}
