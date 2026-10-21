import { Form, InputNumber, Modal } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { validateForm } from "@/lib/form";
import {
  submitTenantQuotaChangeRequest,
  reviewTenantQuotaChangeRequest,
  tenantManagementQueryKeys,
  getTenantManagementErrorMessage,
  type TenantQuotaItem,
} from "@/api/tenant";
interface TenantQuotaAdjustmentFormValues {
  newValue: number;
}
interface TenantQuotaRequestModalProps {
  tenantId: string;
  item: TenantQuotaItem;
  onCancel: () => void;
  onSuccess: () => void;
}
export function TenantQuotaRequestModal({
  tenantId,
  item,
  onCancel,
  onSuccess,
}: TenantQuotaRequestModalProps) {
  const [form] = Form.useForm<TenantQuotaAdjustmentFormValues>();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "配额调整",
        successText: "配额已调整",
        errorFallback: "配额调整失败，请稍后重试",
      },
    },
    mutationFn: async ({ newValue }: TenantQuotaAdjustmentFormValues) => {
      try {
        const request = await submitTenantQuotaChangeRequest({
          tenantId,
          items: [{ resourceType: item.resourceType, newValue }],
        });
        return await reviewTenantQuotaChangeRequest({
          tenantId,
          requestId: request.id,
          approved: true,
        });
      } catch (error) {
        throw new Error(getTenantManagementErrorMessage(error));
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tenantManagementQueryKeys.all });
      onSuccess();
    },
  });
  return (
    <Modal
      visible
      okText="确认调整"
      title={`配额调整：${item.displayName}`}
      confirmLoading={mutation.isPending}
      cancelButtonProps={{ disabled: mutation.isPending }}
      onCancel={onCancel}
      onOk={async () => mutation.mutate(await validateForm(form))}
    >
      <div className="mb-4 text-sm text-(--color-text-3)">确认后将直接调整配额，无需审批。</div>
      <Form form={form} layout="vertical" initialValues={{ newValue: item.total }}>
        <Form.Item
          label={`新上限（${item.unit}）`}
          field="newValue"
          rules={[
            { required: true, message: "请输入新上限" },
            {
              validator: (value, callback) =>
                callback(
                  !Number.isFinite(value) || value < item.used
                    ? `新上限不能低于当前用量 ${item.used} ${item.unit}`
                    : undefined,
                ),
            },
          ]}
        >
          <InputNumber className="w-full" min={item.used} precision={0} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
