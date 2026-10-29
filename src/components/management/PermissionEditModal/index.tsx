import { Form, Modal, Input, Switch } from "@arco-design/web-react";
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
import { ApiTreeSelect } from "../ApiTreeSelect";
interface Props {
  record?: ResourceRecords["permissions"];
  defaults?: EditValues;
  onCancel: () => void;
  onSuccess: () => void;
}
export function PermissionEditModal(props: Props) {
  const { record } = props;
  const detail = useQuery({
    queryKey: managementKeys.detail("permissions", record?.id ?? 0),
    queryFn: ({ signal }) => getManagement("permissions", record!.id, signal),
    enabled: !!record,
    meta: {
      errorNotification: {
        id: withId("management-detail", "permissions", record?.id),
        action: "详情加载",
      },
    },
  });
  return (
    <PermissionEditForm
      key={record?.id ?? "create"}
      {...props}
      record={detail.data ?? record}
      loading={!!record && detail.isPending}
      disabled={!!record && !detail.data}
    />
  );
}
interface PermissionEditFormProps extends Props {
  loading: boolean;
  disabled: boolean;
}

function PermissionEditForm({
  record,
  defaults,
  onCancel,
  onSuccess,
  loading,
  disabled,
}: PermissionEditFormProps) {
  const [form] = Form.useForm<EditValues>();
  const initial = useMemo(() => {
    const values: EditValues = {
      ...(!record ? { status: "ON", apiIds: [] } : {}),
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
      if (!record || changedFields.current.has("code")) values.code = submitted.code ?? "";
      if (!record || changedFields.current.has("groupId")) values.groupId = submitted.groupId ?? 0;
      if (!record || changedFields.current.has("status")) values.status = submitted.status ?? "";
      if (!record || changedFields.current.has("apiIds")) values.apiIds = submitted.apiIds ?? [];

      if (record && Object.keys(values).length === 0) return;
      await saveManagement("permissions", { id: record?.id, values: values });
    },
    meta: { feedback: { channel: "message", action: "保存权限点" } },
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
      title={record ? "编辑权限点" : "新建权限点"}
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
          label="权限名称"
          rules={[{ required: true, message: "请填写权限名称" }]}
        >
          <Input placeholder="请输入" allowClear />
        </Form.Item>
        <Form.Item
          field="code"
          label="权限编码"
          rules={[{ required: true, message: "请填写权限编码" }]}
        >
          <Input placeholder="请输入" allowClear />
        </Form.Item>
        <Form.Item field="groupId" label="所属分组">
          <PermissionGroupSelect />
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
        <Form.Item field="apiIds" label="关联 API">
          <ApiTreeSelect />
        </Form.Item>
      </Form>
    </Modal>
  );
}
