import { Form, Input, InputNumber, Modal } from "@arco-design/web-react";
import { useTenantManagement } from "@/hooks/useTenantManagement";
import { validateForm } from "@/lib/form";
import { showMessage } from "@/lib/feedback";
interface CreditAdjustmentModalProps {
  tenantId: string;
  onCancel: () => void;
  onSuccess: () => void;
}
interface CreditAdjustmentFormValues {
  amount: number;
  reason?: string;
}
export function CreditAdjustmentModal({
  tenantId,
  onCancel,
  onSuccess,
}: CreditAdjustmentModalProps) {
  const [form] = Form.useForm<CreditAdjustmentFormValues>();
  const { applyTenantBillingAction } = useTenantManagement();
  const submit = async () => {
    const values = await validateForm(form);
    const result = applyTenantBillingAction(tenantId, "adjust_credit", {
      amountUsd: values.amount,
      reason: values.reason,
    });
    showMessage({
      type: result.ok ? "success" : "error",
      content: result.ok ? (result.message ?? "授信调账已完成") : (result.reason ?? "授信调账失败"),
    });
    if (result.ok) onSuccess();
  };
  return (
    <Modal visible title="授信调账" onCancel={onCancel} onOk={submit} okText="确认调账">
      <Form form={form} layout="vertical">
        <Form.Item
          field="amount"
          label="调账金额（USD）"
          rules={[
            { required: true, message: "请输入调账金额" },
            {
              validator: (value, callback) =>
                callback(!Number.isFinite(value) || value === 0 ? "请输入非零调账金额" : undefined),
            },
          ]}
        >
          <InputNumber
            precision={2}
            className="w-full"
            placeholder="正数增加余额与授信，负数扣减余额"
          />
        </Form.Item>
        <Form.Item field="reason" label="调账原因">
          <Input.TextArea placeholder="未填写时记为人工调账" maxLength={200} showWordLimit />
        </Form.Item>
      </Form>
    </Modal>
  );
}
