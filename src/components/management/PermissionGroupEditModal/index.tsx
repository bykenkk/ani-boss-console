import { Form, Modal, Input, InputNumber, Switch } from "@arco-design/web-react";
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

import { PermissionGroupSelect } from "@/components/management/PermissionGroupSelect";
interface Props {
  record?: ResourceRecords["permission-groups"];
  defaults?: EditValues;
  onCancel: () => void;
  onSuccess: () => void;
}
export function PermissionGroupEditModal(props: Props) {
  const { record } = props;
  const detail = useQuery({
    queryKey: managementKeys.detail("permission-groups", record?.id ?? 0),
    queryFn: ({ signal }) => getManagement("permission-groups", record!.id, signal),
    enabled: !!record,
    meta: {
      errorNotification: {
        id: withId("management-detail", "permission-groups", record?.id),
        action: "详情加载",
      },
    },
  });
  return (
    <PermissionGroupEditForm
      key={record?.id ?? "create"}
      {...props}
      record={detail.data ?? record}
      loading={!!record && detail.isPending}
      disabled={!!record && !detail.data}
    />
  );
}
interface PermissionGroupEditFormProps extends Props {
  loading: boolean;
  disabled: boolean;
}

function PermissionGroupEditForm({
  record,
  defaults,
  onCancel,
  onSuccess,
  loading,
  disabled,
}: PermissionGroupEditFormProps) {
  const [form] = Form.useForm<EditValues>();
  const initial = useMemo(() => {
    const values: EditValues = {
      ...(!record ? { parentId: 0, sortOrder: 1, status: "ON" } : {}),
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
      if (!record || changedFields.current.has("module")) values.module = submitted.module ?? "";
      if (!record || changedFields.current.has("parentId"))
        values.parentId = submitted.parentId ?? 0;
      if (!record || changedFields.current.has("sortOrder"))
        values.sortOrder = submitted.sortOrder ?? 1;
      if (!record || changedFields.current.has("status")) values.status = submitted.status ?? "";

      if (record && Object.keys(values).length === 0) return;
      await saveManagement("permission-groups", { id: record?.id, values: values });
    },
    meta: { feedback: { channel: "message", action: "保存权限分组" } },
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
      title={record ? "编辑权限分组" : "新建权限分组"}
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
          label="分组名称"
          rules={[{ required: true, message: "请填写分组名称" }]}
        >
          <Input placeholder="请输入" allowClear />
        </Form.Item>
        <Form.Item field="module" label="模块" rules={[{ required: true, message: "请填写模块" }]}>
          <Input placeholder="请输入" allowClear />
        </Form.Item>

        <Form.Item field="parentId" label="上级分组">
          <PermissionGroupSelect includeRoot excludeSubtreeId={record?.id} />
        </Form.Item>
        <Form.Item
          field="sortOrder"
          label="排序"
          rules={[{ required: true, message: "请填写排序" }]}
        >
          <InputNumber min={0} precision={0} placeholder="请输入" />
        </Form.Item>
        <Form.Item
          field="status"
          label="状态"
          triggerPropName="checked"
          formatter={(value) => value === "ON"}
          normalize={(checked) => (checked ? "ON" : "OFF")}
          rules={[{ required: true, message: "请填写状态" }]}
        >
          <Switch checkedText="启用" uncheckedText="禁用" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
