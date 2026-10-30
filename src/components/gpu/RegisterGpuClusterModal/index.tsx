import { Form, Input, Modal } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  acceleratorKeys,
  registerGpuCluster,
  type RegisterGpuClusterInput,
} from "@/api/accelerator";
import { validateForm } from "@/lib/form";
export function RegisterGpuClusterModal({ onCancel }: { onCancel: () => void }) {
  const [form] = Form.useForm<RegisterGpuClusterInput>();
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: registerGpuCluster,
    meta: {
      feedback: { channel: "message", action: "GPU 集群登记", successText: "GPU 集群已登记" },
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: acceleratorKeys.all });
      onCancel();
    },
  });
  return (
    <Modal
      visible
      title="登记 GPU 集群"
      onCancel={onCancel}
      confirmLoading={mutation.isPending}
      cancelButtonProps={{ disabled: mutation.isPending }}
      onOk={async () => mutation.mutate(await validateForm<RegisterGpuClusterInput>(form))}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          field="display_name"
          label="集群名称"
          rules={[{ required: true, match: /\S/, message: "请输入集群名称" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          field="connection_ref"
          label="受管连接引用"
          extra="填写平台提供的连接引用"
          rules={[{ required: true, match: /\S/, message: "请输入受管连接引用" }]}
        >
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
}
