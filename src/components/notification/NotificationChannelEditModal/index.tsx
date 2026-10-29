import { Form, Input, InputNumber, Modal, Select, Switch } from "@arco-design/web-react";
import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createNotificationChannel,
  getNotificationChannel,
  notificationChannelKeys,
  updateNotificationChannel,
  type NotificationChannelDataInput,
  type NotificationChannelInput,
  type NotificationChannelTls,
} from "@/api/notification-channels";
import { validateForm } from "@/lib/form";
import { showMessage } from "@/lib/feedback";
import { withId } from "@/lib/id";
import { channelTlsLabels, channelTypeLabels } from "../NotificationChannelsPage/constants";

interface NotificationChannelEditModalProps {
  channelId?: number;
  onCancel: () => void;
  onSuccess: () => void;
}

interface NotificationChannelFormValues {
  name: string;
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  password?: string;
  smtpFrom: string;
  smtpTls: NotificationChannelTls;
  enabled: boolean;
  remark: string;
}

export function NotificationChannelEditModal({
  channelId,
  onCancel,
  onSuccess,
}: NotificationChannelEditModalProps) {
  const [form] = Form.useForm<NotificationChannelFormValues>();
  const initialized = useRef(false);
  const client = useQueryClient();
  const detail = useQuery({
    queryKey: notificationChannelKeys.detail(channelId ?? 0),
    queryFn: ({ signal }) => getNotificationChannel(channelId!, signal),
    enabled: channelId !== undefined,
    meta: {
      errorNotification: {
        id: withId("notification-channel-detail", channelId),
        action: "通知渠道加载",
      },
    },
  });
  const original = useRef(detail.data);
  const ready = channelId === undefined || !!detail.data;
  const type = channelId === undefined ? "EMAIL" : detail.data?.type;

  useEffect(() => {
    if (channelId === undefined || !detail.data || initialized.current) return;
    const record = detail.data;
    original.current = record;
    form.setFieldsValue({
      name: record.name ?? "",
      smtpHost: record.smtpHost ?? "",
      smtpPort: record.smtpPort,
      smtpUsername: record.smtpUsername ?? "",
      smtpFrom: record.smtpFrom ?? "",
      smtpTls: record.smtpTls,
      enabled: record.enabled ?? false,
      remark: record.remark ?? "",
      password: "",
    });
    initialized.current = true;
  }, [channelId, detail.data, form]);

  const mutation = useMutation({
    mutationFn: (input: NotificationChannelInput) =>
      channelId === undefined
        ? createNotificationChannel(input)
        : updateNotificationChannel(channelId, input),
    meta: {
      feedback: {
        channel: "message",
        action: channelId === undefined ? "新建通知渠道" : "保存通知渠道",
      },
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: notificationChannelKeys.all });
      onSuccess();
    },
  });
  const busy = mutation.isPending;

  const submit = async () => {
    if (!ready || busy) return;
    let values: NotificationChannelFormValues;
    try {
      values = await validateForm<NotificationChannelFormValues>(form);
    } catch {
      return;
    }
    const current = original.current;
    const data: NotificationChannelDataInput = {};
    const name = values.name.trim();
    if (!current || name !== (current.name ?? "")) data.name = name;
    if (!current || values.enabled !== (current.enabled ?? false)) data.enabled = values.enabled;
    if (!current || (values.remark ?? "") !== (current.remark ?? ""))
      data.remark = values.remark ?? "";
    if (channelId === undefined) data.type = "EMAIL";
    if (type === "EMAIL") {
      if (!current || values.smtpHost.trim() !== (current.smtpHost ?? ""))
        data.smtpHost = values.smtpHost.trim();
      if (!current || values.smtpPort !== current.smtpPort) data.smtpPort = values.smtpPort;
      if (!current || (values.smtpUsername ?? "") !== (current.smtpUsername ?? ""))
        data.smtpUsername = values.smtpUsername ?? "";
      if (!current || values.smtpFrom.trim() !== (current.smtpFrom ?? ""))
        data.smtpFrom = values.smtpFrom.trim();
      if (!current || values.smtpTls !== current.smtpTls) data.smtpTls = values.smtpTls;
    }
    const password = type === "EMAIL" ? values.password : undefined;
    if (current && Object.keys(data).length === 0 && !password) {
      showMessage({ type: "info", content: "没有需要保存的修改" });
      return;
    }
    mutation.mutate({ data, ...(password ? { password } : {}) });
  };

  return (
    <Modal
      visible
      title={channelId === undefined ? "新建通知渠道" : "编辑通知渠道"}
      style={{ width: 560 }}
      onCancel={onCancel}
      onOk={submit}
      okText="保存"
      okButtonProps={{ disabled: !ready }}
      confirmLoading={busy}
      cancelButtonProps={{ disabled: busy }}
      closable={!busy}
      escToExit={!busy}
      maskClosable={false}
    >
      <Form
        form={form}
        layout="vertical"
        disabled={!ready || busy}
        autoComplete="off"
        initialValues={
          channelId === undefined
            ? {
                name: "",
                smtpHost: "",
                smtpUsername: "",
                smtpFrom: "",
                smtpTls: "START_TLS",
                smtpPort: 587,
                enabled: true,
                remark: "",
              }
            : undefined
        }
      >
        <Form.Item
          field="name"
          label="渠道名称"
          rules={[{ required: true, match: /\S/, message: "请输入渠道名称" }]}
        >
          <Input placeholder="请输入渠道名称" />
        </Form.Item>
        <Form.Item label="渠道类型">
          <Input value={type ? channelTypeLabels[type] : ""} disabled />
        </Form.Item>
        {/* TODO(notification-channel-webhook): 上游契约仅预留 WEBHOOK，补齐 URL、签名和载荷模板契约并部署后再开放创建及配置。 */}
        {type === "EMAIL" && (
          <>
            <Form.Item
              field="smtpHost"
              label="SMTP 服务器"
              rules={[{ required: true, match: /\S/, message: "请输入 SMTP 服务器" }]}
            >
              <Input placeholder="smtp.example.com" />
            </Form.Item>
            <Form.Item
              field="smtpPort"
              label="SMTP 端口"
              rules={[
                {
                  required: true,
                  type: "number",
                  min: 1,
                  max: 65535,
                  message: "请输入 1–65535 的整数端口",
                },
              ]}
            >
              <InputNumber min={1} max={65535} precision={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item field="smtpUsername" label="SMTP 用户名">
              <Input placeholder="请输入 SMTP 用户名" />
            </Form.Item>
            <Form.Item
              field="password"
              label="SMTP 密码 / 授权码"
              extra={
                channelId !== undefined
                  ? detail.data?.hasPassword
                    ? "已配置密码，留空保留原密码"
                    : "尚未配置密码"
                  : undefined
              }
              rules={
                channelId === undefined
                  ? [{ required: true, message: "请输入 SMTP 密码或授权码" }]
                  : []
              }
            >
              <Input.Password
                autoComplete="new-password"
                placeholder={channelId === undefined ? "请输入密码或授权码" : "留空保留原密码"}
              />
            </Form.Item>
            <Form.Item
              field="smtpFrom"
              label="发件人邮箱"
              rules={[
                { required: true, message: "请输入发件人邮箱" },
                { type: "email", message: "请输入有效的邮箱地址" },
              ]}
            >
              <Input placeholder="noreply@example.com" />
            </Form.Item>
            <Form.Item
              field="smtpTls"
              label="加密方式"
              rules={[{ required: true, message: "请选择加密方式" }]}
            >
              <Select
                options={Object.entries(channelTlsLabels).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            </Form.Item>
          </>
        )}
        <Form.Item field="enabled" label="启用" triggerPropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item field="remark" label="备注">
          <Input.TextArea placeholder="请输入备注" rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
