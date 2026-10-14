import { Button, Form, Modal, Input } from "@arco-design/web-react";
import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  managementKeys,
  saveManagement,
  type EditValues,
  type ResourceRecords,
} from "@/api/management";
import { validateForm } from "@/lib/form";

interface Props {
  record?: ResourceRecords["plan-quotas"];
  defaults?: EditValues;
  onCancel: () => void;
  onSuccess: () => void;
}
export function PlanQuotaEditModal(props: Props) {
  const { record, onCancel } = props;
  return (
    <Modal
      visible
      title={record ? "编辑套餐配额" : "新建套餐配额"}
      footer={null}
      onCancel={onCancel}
      maskClosable={false}
      style={{ width: 680 }}
    >
      <PlanQuotaEditForm {...props} record={record} />
    </Modal>
  );
}
function PlanQuotaEditForm({ record, defaults, onCancel, onSuccess }: Props) {
  const [form] = Form.useForm<EditValues>();
  const initial: EditValues = { ...(!record ? {} : {}), ...record, ...defaults };

  const changedFields = useRef(new Set<string>());
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (submitted: EditValues) => {
      const values: EditValues = {};
      if (!record || changedFields.current.has("quotaCode"))
        values.quotaCode = submitted.quotaCode ?? "";
      if (!record || changedFields.current.has("quotaValue"))
        values.quotaValue = submitted.quotaValue ?? "";

      if (record && Object.keys(values).length === 0) return;
      await saveManagement("plan-quotas", { id: record?.id, values: { ...values, ...defaults } });
    },
    meta: { feedback: { channel: "message", action: "保存套餐配额" } },
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
          field="quotaCode"
          label="配额编码"
          rules={[{ required: true, message: "请填写配额编码" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          field="quotaValue"
          label="配额值"
          rules={[
            { required: true, message: "请填写配额值" },
            {
              validator: (value: unknown, callback: (message?: string) => void) => {
                if (
                  !/^\d+$/.test(String(value ?? "")) ||
                  BigInt(String(value)) > 18446744073709551615n
                )
                  callback("请输入 uint64 范围内的非负整数");
                else callback();
              },
            },
          ]}
        >
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
