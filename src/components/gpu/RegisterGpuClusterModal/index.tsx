import { Alert, Form, Input, Modal } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { acceleratorKeys, registerGpuCluster, type GpuClusterTarget } from "@/api/accelerator";
import { validateForm } from "@/lib/form";
interface RegisterGpuClusterModalProps {
  target: GpuClusterTarget;
  principal: string;
  onCancel: () => void;
}
interface RegisterGpuClusterForm {
  display_name: string;
}
export function RegisterGpuClusterModal({
  target,
  principal,
  onCancel,
}: RegisterGpuClusterModalProps) {
  const [form] = Form.useForm<RegisterGpuClusterForm>();
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (data: RegisterGpuClusterForm) =>
      registerGpuCluster(
        { display_name: data.display_name.trim(), expected_cluster_id: target.cluster_id },
        { principal, connection_ref: target.connection_ref, cluster_id: target.cluster_id },
      ),
    retry: false,
    meta: {
      feedback: { channel: "message", action: "GPU 集群启用", successText: "GPU 集群已启用" },
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: acceleratorKeys.all });
      onCancel();
    },
  });
  return (
    <Modal
      visible
      title="确认启用 GPU 管理"
      onCancel={onCancel}
      confirmLoading={mutation.isPending}
      cancelButtonProps={{ disabled: mutation.isPending }}
      onOk={async () => mutation.mutate(await validateForm<RegisterGpuClusterForm>(form))}
    >
      <Alert content="将为以下已确认目标启用 GPU 管理。受管连接由服务端配置。" />
      <div className="my-4 break-all">
        目标 UID：{target.cluster_id}
        <br />
        受管连接：{target.connection_ref}
      </div>
      <Form form={form} layout="vertical" initialValues={{ display_name: target.display_name }}>
        <Form.Item
          field="display_name"
          label="集群名称"
          rules={[{ required: true, match: /\S/, message: "请输入集群名称" }]}
        >
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
}
