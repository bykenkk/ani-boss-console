import { Form, Input, Modal } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { createVirtualSwitch, virtualSwitchKeys } from "@/api/virtual-switches";
import { validateForm } from "@/lib/form";

interface VirtualSwitchCreateModalProps {
  onCancel: () => void;
  onSuccess: () => void;
}

interface VirtualSwitchCreateFormValues {
  name: string;
}

export function VirtualSwitchCreateModal({ onCancel, onSuccess }: VirtualSwitchCreateModalProps) {
  const [form] = Form.useForm<VirtualSwitchCreateFormValues>();
  const client = useQueryClient();
  const submitting = useRef(false);
  const mutation = useMutation({
    mutationFn: createVirtualSwitch,
    meta: {
      feedback: {
        channel: "message",
        id: "virtual-switch-create",
        action: "创建虚拟交换机",
        successText: "创建已提交",
      },
    },
    onSuccess: async () => {
      // TODO(network-task): 资源任务跟踪统一接入后补充创建进度，当前仅刷新列表。
      await client.invalidateQueries({ queryKey: virtualSwitchKeys.all });
      onSuccess();
    },
  });
  const submit = async () => {
    if (submitting.current) return;
    submitting.current = true;
    try {
      const values = await validateForm<VirtualSwitchCreateFormValues>(form);
      await mutation.mutateAsync({ name: values.name });
    } catch {
      // 校验及请求错误分别由统一校验入口和 mutation 反馈处理。
    } finally {
      submitting.current = false;
    }
  };

  return (
    <Modal
      title="创建虚拟交换机"
      visible
      style={{ width: 560 }}
      onCancel={onCancel}
      onOk={submit}
      okText="确定"
      confirmLoading={mutation.isPending}
      cancelButtonProps={{ disabled: mutation.isPending }}
      closable={!mutation.isPending}
      escToExit={!mutation.isPending}
    >
      <Form
        form={form}
        layout="vertical"
        disabled={mutation.isPending}
        onSubmitCapture={(event) => {
          event.preventDefault();
          event.stopPropagation();
          submit();
        }}
      >
        <Form.Item
          field="name"
          label="名称"
          rules={[
            { required: true, message: "请输入虚拟交换机名称" },
            {
              match: /^[A-Za-z0-9]([A-Za-z0-9_-]{0,61}[A-Za-z0-9])?$/,
              message: "请输入 1–63 位字母、数字、下划线或连字符，并以字母或数字开头和结尾",
            },
          ]}
          extra="1–63 位，支持字母、数字、下划线和连字符，以字母或数字开头和结尾。"
        >
          <Input placeholder="请输入名称" maxLength={63} autoFocus />
        </Form.Item>
      </Form>
    </Modal>
  );
}
