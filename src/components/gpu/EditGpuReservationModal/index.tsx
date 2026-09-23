import { Alert, Form, InputNumber, Modal } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  gpuResourcePoolQueryKeys,
  updateTenantGpuReservation,
  type TenantGpuAllocation,
} from "@/api/gpu-inventory";
import { validateForm } from "@/lib/form";

interface ReservationFormValues {
  allocatedGpuCount: number;
}

interface EditGpuReservationModalProps {
  tenant: TenantGpuAllocation;
  onCancel: () => void;
  onSuccess: () => void;
}

export function EditGpuReservationModal({
  tenant,
  onCancel,
  onSuccess,
}: EditGpuReservationModalProps) {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<ReservationFormValues>();
  const mutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "GPU 资源预留更新",
        successText: "GPU 资源预留已更新",
        errorFallback: "GPU 资源预留更新失败，请稍后重试",
      },
    },
    mutationFn: updateTenantGpuReservation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: gpuResourcePoolQueryKeys.tenants });
      onSuccess();
    },
  });

  const submit = async () => {
    const { allocatedGpuCount } = await validateForm<ReservationFormValues>(form);
    mutation.mutate({ tenantId: tenant.tenantId, allocatedGpuCount });
  };

  return (
    <Modal
      title={`调整 GPU 资源预留：${tenant.tenantName}`}
      visible
      confirmLoading={mutation.isPending}
      onOk={submit}
      onCancel={onCancel}
    >
      <Alert
        type="warning"
        content="这里调整的是租户聚合预留上限，不会绑定到某一张物理 GPU。填写 0 会把预留上限设为 0；若低于当前已用量或处理中占用，后端会自动收紧到安全值。"
        className="mb-4"
      />
      <Form
        form={form}
        layout="vertical"
        initialValues={{ allocatedGpuCount: tenant.allocatedGpuCount }}
      >
        <Form.Item
          label="预留 GPU 卡数"
          field="allocatedGpuCount"
          rules={[
            {
              required: true,
              type: "number",
              min: 0,
              max: tenant.quotaTotal,
            },
          ]}
        >
          <InputNumber min={0} max={tenant.quotaTotal} precision={0} className="w-full" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
