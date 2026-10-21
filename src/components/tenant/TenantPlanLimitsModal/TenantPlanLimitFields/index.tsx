import { Form, InputNumber } from "@arco-design/web-react";
import type { TenantPlanQuotaLimit } from "@/api/tenant";

interface TenantPlanLimitFieldsProps {
  limits: TenantPlanQuotaLimit[];
}
export function TenantPlanLimitFields({ limits }: TenantPlanLimitFieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-x-4">
      {limits.map((item) => (
        <Form.Item
          key={item.resourceType}
          field={`limits.${item.resourceType}`}
          label={`${item.displayName}（${item.unit}）`}
          initialValue={item.total}
          rules={[
            { required: true, message: "请输入上限" },
            {
              validator: (value, callback) =>
                callback(
                  !Number.isFinite(value) || value < 0 || !Number.isInteger(value)
                    ? "请输入有效的非负整数"
                    : undefined,
                ),
            },
          ]}
        >
          <InputNumber className="w-full" min={0} precision={0} />
        </Form.Item>
      ))}
    </div>
  );
}
