import { Form, Modal, Input, Select, InputNumber } from "@arco-design/web-react";
import { useEffect, useMemo, useRef } from "react";
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
  const { record } = props;
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
    <PlanEditForm
      key={record?.id ?? "create"}
      {...props}
      record={detail.data ?? record}
      loading={!!record && detail.isPending}
      disabled={!!record && !detail.data}
    />
  );
}
interface PlanEditFormProps extends Props {
  loading: boolean;
  disabled: boolean;
}

function PlanEditForm({
  record,
  defaults,
  onCancel,
  onSuccess,
  loading,
  disabled,
}: PlanEditFormProps) {
  const [form] = Form.useForm<EditValues>();
  const initial = useMemo(() => {
    const values: EditValues = {
      ...(!record ? { version: "STANDARD", expiryPolicy: "READONLY", dataRetentionDays: 30 } : {}),
      ...record,
      ...defaults,
    };
    return values;
  }, [record, defaults]);

  const changedFields = useRef(new Set<string>());
  const detailInitialized = useRef(!disabled);
  useEffect(() => {
    if (disabled || detailInitialized.current) return;
    form.setFieldsValue(initial);
    changedFields.current.clear();
    detailInitialized.current = true;
  }, [disabled, form, initial]);
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
  const busy = loading || mutation.isPending;
  const submit = async () => {
    if (disabled || busy) return;
    try {
      mutation.mutate(await validateForm<EditValues>(form));
    } catch {
      /* 统一校验入口已反馈 */
    }
  };
  return (
    <Modal
      visible
      title={record ? "编辑套餐" : "新建套餐"}
      onCancel={onCancel}
      onOk={submit}
      okText="保存"
      confirmLoading={mutation.isPending}
      okButtonProps={{ disabled: disabled || loading }}
      cancelButtonProps={{ disabled: busy }}
      closable={!busy}
      escToExit={!busy}
      style={{ width: 680 }}
    >
      <Form
        form={form}
        disabled={disabled || busy}
        layout="vertical"
        initialValues={initial}
        onValuesChange={(changed) => {
          Object.keys(changed).forEach((key) => changedFields.current.add(key));
        }}
      >
        <Form.Item
          field="name"
          label="套餐名称"
          rules={[{ required: true, message: "请填写套餐名称" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          field="version"
          label="套餐版本"
          rules={[{ required: true, message: "请填写套餐版本" }]}
        >
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
          label="到期处置策略"
          rules={[{ required: true, message: "请填写到期处置策略" }]}
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
        <Form.Item field="description" label="描述">
          <Input.TextArea />
        </Form.Item>
        <Form.Item field="remark" label="备注">
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
}
