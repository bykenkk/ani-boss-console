import { Button, Form, Modal, Spin, Input, Select } from "@arco-design/web-react";
import { useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  managementKeys,
  saveManagement,
  getManagement,
  type EditValues,
  type ResourceRecords,
} from "@/api/management";
import { validateForm } from "@/lib/form";
import { withId } from "@/lib/id";

interface Props {
  record?: ResourceRecords["apis"];
  defaults?: EditValues;
  onCancel: () => void;
  onSuccess: () => void;
}
export function ApiEditModal(props: Props) {
  const { record, onCancel } = props;
  const detail = useQuery({
    queryKey: managementKeys.detail("apis", record?.id ?? 0),
    queryFn: ({ signal }) => getManagement("apis", record!.id, signal),
    enabled: !!record,
    meta: {
      errorNotification: {
        id: withId("management-detail", "apis", record?.id),
        action: "详情加载",
      },
    },
  });
  return (
    <Modal
      visible
      title={record ? "编辑API" : "新建API"}
      footer={null}
      onCancel={onCancel}
      maskClosable={false}
      style={{ width: 680 }}
    >
      {!record || detail.isSuccess ? (
        <ApiEditForm {...props} record={detail.data ?? record} />
      ) : (
        <Spin loading={detail.isPending}>
          <div className="py-8">详情尚未加载，暂不能编辑。</div>
        </Spin>
      )}
    </Modal>
  );
}
function ApiEditForm({ record, defaults, onCancel, onSuccess }: Props) {
  const [form] = Form.useForm<EditValues>();
  const initial: EditValues = {
    ...(!record ? { method: "GET", scope: "ADMIN", status: "ON" } : {}),
    ...record,
    ...defaults,
  };

  const changedFields = useRef(new Set<string>());
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (submitted: EditValues) => {
      const values: EditValues = {};
      if (!record || changedFields.current.has("path")) values.path = submitted.path ?? "";
      if (!record || changedFields.current.has("method")) values.method = submitted.method ?? "";
      if (!record || changedFields.current.has("operation"))
        values.operation = submitted.operation ?? "";
      if (!record || changedFields.current.has("module")) values.module = submitted.module ?? "";
      if (!record || changedFields.current.has("businessModule"))
        values.businessModule = submitted.businessModule ?? "";
      if (!record || changedFields.current.has("scope")) values.scope = submitted.scope ?? "";
      if (!record || changedFields.current.has("status")) values.status = submitted.status ?? "";
      if (!record || changedFields.current.has("description"))
        values.description = submitted.description ?? "";

      if (record && Object.keys(values).length === 0) return;
      await saveManagement("apis", { id: record?.id, values: values });
    },
    meta: { feedback: { channel: "message", action: "保存API" } },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: managementKeys.all });
      onSuccess();
    },
  });
  const submit = async () => {
    if (mutation.isPending) return;
    try {
      mutation.mutate(await validateForm<EditValues>(form));
    } catch {
      /* 统一校验入口已反馈 */
    }
  };
  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initial}
      onValuesChange={(changed) => {
        Object.keys(changed).forEach((key) => changedFields.current.add(key));
      }}
    >
      <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
        <Form.Item
          field="path"
          label="接口路径"
          rules={[{ required: true, message: "请填写接口路径" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          field="method"
          label="请求方法"
          rules={[{ required: true, message: "请填写请求方法" }]}
        >
          <Select
            options={[
              { value: "GET", label: "GET" },
              { value: "POST", label: "POST" },
              { value: "PUT", label: "PUT" },
              { value: "PATCH", label: "PATCH" },
              { value: "DELETE", label: "DELETE" },
              { value: "HEAD", label: "HEAD" },
              { value: "OPTIONS", label: "OPTIONS" },
            ]}
          />
        </Form.Item>
        <Form.Item field="operation" label="操作标识">
          <Input />
        </Form.Item>
        <Form.Item field="module" label="模块">
          <Input />
        </Form.Item>
        <Form.Item field="businessModule" label="业务模块">
          <Input />
        </Form.Item>
        <Form.Item
          field="scope"
          label="作用域"
          rules={[{ required: true, message: "请填写作用域" }]}
        >
          <Select
            options={[
              { value: "ADMIN", label: "管理后台" },
              { value: "APP", label: "应用" },
            ]}
          />
        </Form.Item>
        <Form.Item field="status" label="状态" rules={[{ required: true, message: "请填写状态" }]}>
          <Select
            options={[
              { value: "ON", label: "启用" },
              { value: "OFF", label: "禁用" },
            ]}
          />
        </Form.Item>
        <Form.Item field="description" label="说明" className="md:col-span-2">
          <Input.TextArea />
        </Form.Item>
      </div>
      <div className="flex justify-end gap-3">
        <Button onClick={onCancel} disabled={mutation.isPending}>
          取消
        </Button>
        <Button type="primary" loading={mutation.isPending} onClick={submit}>
          保存
        </Button>
      </div>
    </Form>
  );
}
