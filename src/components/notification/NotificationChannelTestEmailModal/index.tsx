import { Form, Input, Modal } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import { sendNotificationChannelTestEmail } from "@/api/notification-channels";
import { validateForm } from "@/lib/form";

interface NotificationChannelTestEmailModalProps {
  channelId: number;
  channelName: string;
  onCancel: () => void;
}
interface NotificationChannelTestEmailFormValues {
  recipient: string;
}

export function NotificationChannelTestEmailModal({
  channelId,
  channelName,
  onCancel,
}: NotificationChannelTestEmailModalProps) {
  const [form] = Form.useForm<NotificationChannelTestEmailFormValues>();
  const mutation = useMutation({
    mutationFn: (values: NotificationChannelTestEmailFormValues) =>
      sendNotificationChannelTestEmail(channelId, values.recipient.trim()),
    meta: {
      feedback: { channel: "message", action: "发送测试邮件", successText: "测试邮件已发送" },
    },
    onSuccess: onCancel,
  });
  const submit = async () => {
    if (mutation.isPending) return;
    try {
      mutation.mutate(await validateForm<NotificationChannelTestEmailFormValues>(form));
    } catch {
      // 统一校验入口已反馈。
    }
  };
  return (
    <Modal
      visible
      title={"发送测试邮件 · " + channelName}
      style={{ width: 440 }}
      onCancel={onCancel}
      onOk={submit}
      okText="发送"
      confirmLoading={mutation.isPending}
      cancelButtonProps={{ disabled: mutation.isPending }}
      closable={!mutation.isPending}
      escToExit={!mutation.isPending}
      maskClosable={false}
    >
      <Form form={form} layout="vertical" disabled={mutation.isPending}>
        <Form.Item
          field="recipient"
          label="收件人邮箱"
          rules={[
            { required: true, message: "请输入收件人邮箱" },
            { type: "email", message: "请输入有效的邮箱地址" },
          ]}
        >
          <Input placeholder="you@example.com" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
