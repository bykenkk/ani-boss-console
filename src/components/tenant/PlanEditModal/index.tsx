import { Button, Form, Modal, Spin, Input, Select, InputNumber } from "@arco-design/web-react";
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
  record?: ResourceRecords["plans"];
  defaults?: EditValues;
  onCancel: () => void;
  onSuccess: () => void;
}
export function PlanEditModal(props: Props) {
  const { record, onCancel } = props;
  const detail = useQuery({
    queryKey: managementKeys.detail("plans", record?.id ?? 0),
    queryFn: ({ signal }) => getManagement("plans", record!.id, signal),
    enabled: !!record,
    meta: {
      errorNotification: {
        id: withId("management-detail", "plans", record?.id),
        action: "详情加载",
      },
    },
  });
  return (
    <Modal
      visible
      title={record ? "编辑套餐" : "新建套餐"}
      footer={null}
      onCancel={onCancel}
      maskClosable={false}
      style={{ width: 680 }}
    >
      {!record || detail.isSuccess ? (
        <PlanEditForm {...props} record={detail.data ?? record} />
      ) : (
        <Spin loading={detail.isPending}>
          <div className="py-8">详情尚未加载，暂不能编辑。</div>
        </Spin>
      )}
    </Modal>
  );
}
function PlanEditForm({ record, defaults, onCancel, onSuccess }: Props) {
  const [form] = Form.useForm<EditValues>();
  const initial: EditValues = {
    ...(!record ? { version: "STANDARD", expiryPolicy: "READONLY", dataRetentionDays: 30 } : {}),
    ...record,
    ...defaults,
  };

  const changedFields = useRef(new Set<string>());
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (submitted: EditValues) => {
      const values: EditValues = {};
      if (!record || changedFields.current.has("name")) values.name = submitted.name ?? "";
      if (!record || changedFields.current.has("version")) values.version = submitted.version ?? "";
      if (!record || changedFields.current.has("expiryPolicy"))
        values.expiryPolicy = submitted.expiryPolicy ?? "";
      if (!record || changedFields.current.has("dataRetentionDays"))
        values.dataRetentionDays = submitted.dataRetentionDays ?? 0;
      if (!record || changedFields.current.has("description"))
        values.description = submitted.description ?? "";
      if (!record || changedFields.current.has("remark")) values.remark = submitted.remark ?? "";

      if (record && Object.keys(values).length === 0) return;
      await saveManagement("plans", { id: record?.id, values: values });
    },
    meta: { feedback: { channel: "message", action: "保存套餐" } },
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
        <Form.Item field="name" label="名称" rules={[{ required: true, message: "请填写名称" }]}>
          <Input />
        </Form.Item>
        <Form.Item field="version" label="版本" rules={[{ required: true, message: "请填写版本" }]}>
          <Select
            options={[
              { value: "FREE", label: "免费版" },
              { value: "STANDARD", label: "标准版" },
              { value: "ENTERPRISE", label: "企业版" },
            ]}
          />
        </Form.Item>
        <Form.Item
          field="expiryPolicy"
          label="到期策略"
          rules={[{ required: true, message: "请填写到期策略" }]}
        >
          <Select
            options={[
              { value: "READONLY", label: "只读" },
              { value: "BLOCK_LOGIN", label: "禁止登录" },
              { value: "FREEZE", label: "冻结" },
            ]}
          />
        </Form.Item>
        <Form.Item field="dataRetentionDays" label="数据保留天数">
          <InputNumber min={0} precision={0} />
        </Form.Item>
        <Form.Item field="description" label="说明" className="md:col-span-2">
          <Input.TextArea />
        </Form.Item>
        <Form.Item field="remark" label="备注">
          <Input />
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
