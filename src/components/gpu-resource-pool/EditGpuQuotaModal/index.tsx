import { Alert, Form, InputNumber, Modal } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  gpuResourcePoolQueryKeys,
  updateTenantGpuQuota,
  type TenantGpuAllocation,
} from "@/api/gpu-inventory";
import { showMessage } from "@/lib/feedback";
import { validateForm } from "@/lib/form";

interface QuotaFormValues {
  total: number;
}

interface EditGpuQuotaModalProps {
  tenant: TenantGpuAllocation;
  onCancel: () => void;
  onSuccess: () => void;
}

export function EditGpuQuotaModal({ tenant, onCancel, onSuccess }: EditGpuQuotaModalProps) {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<QuotaFormValues>();
  const mutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "GPU 配额上限更新",
        successText: "GPU 配额上限已更新",
        errorFallback: "GPU 配额上限更新失败，请稍后重试",
      },
    },
    mutationFn: updateTenantGpuQuota,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: gpuResourcePoolQueryKeys.tenants });
      onSuccess();
    },
  });

  const submit = async () => {
    const { total } = await validateForm<QuotaFormValues>(form);
    if (total < tenant.allocatedGpuCount) {
      showMessage({
        type: "warning",
        content: `配额上限不能低于当前资源预留 ${tenant.allocatedGpuCount} 张`,
      });
      return;
    }
    mutation.mutate({ tenantId: tenant.tenantId, total });
  };

  return (
    <Modal
      title={`调整 GPU 配额上限：${tenant.tenantName}`}
      visible
      confirmLoading={mutation.isPending}
      onOk={submit}
      onCancel={onCancel}
    >
      <Alert
        type="warning"
        content={`配额上限不得低于当前资源预留 ${tenant.allocatedGpuCount} 张；如需继续降低，请先调整资源预留。`}
        className="mb-4"
      />
      <Form form={form} layout="vertical" initialValues={{ total: tenant.quotaTotal }}>
        <Form.Item
          label="GPU 卡数上限"
          field="total"
          rules={[
            {
              required: true,
              type: "number",
              min: tenant.allocatedGpuCount,
            },
          ]}
        >
          <InputNumber min={tenant.allocatedGpuCount} precision={0} className="w-full" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
