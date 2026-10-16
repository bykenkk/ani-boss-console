import { Form, Modal, Spin, Input, Select, InputNumber } from "@arco-design/web-react";
import { useRef, useState } from "react";
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

import { ManagementRelationSelect } from "../ManagementRelationSelect";
interface Props {
  record?: ResourceRecords["roles"];
  defaults?: EditValues;
  onCancel: () => void;
  onSuccess: () => void;
}
export function RoleEditModal(props: Props) {
  const { record, onCancel } = props;
  const detail = useQuery({
    queryKey: managementKeys.detail("roles", record?.id ?? 0),
    queryFn: ({ signal }) => getManagement("roles", record!.id, signal),
    enabled: !!record,
    meta: {
      errorNotification: {
        id: withId("management-detail", "roles", record?.id),
        action: "详情加载",
      },
    },
  });
  if (!record || detail.isSuccess) {
    return <RoleEditForm {...props} record={detail.data ?? record} />;
  }
  return (
    <Modal
      visible
      title={record ? "编辑角色" : "新建角色"}
      okText="保存"
      okButtonProps={{ disabled: true }}
      onCancel={onCancel}
      maskClosable={false}
      style={{ width: 680 }}
    >
      {detail.isPending && (
        <div className="flex justify-center py-8">
          <Spin />
        </div>
      )}
    </Modal>
  );
}
function RoleEditForm({ record, defaults, onCancel, onSuccess }: Props) {
  const [form] = Form.useForm<EditValues>();
  const initial: EditValues = {
    ...(!record
      ? { type: "SYSTEM", tenantId: 0, status: "ON", sortOrder: 0, permissions: [] }
      : {}),
    ...record,
    ...defaults,
  };

  const [roleType, setRoleType] = useState(String(initial.type ?? "SYSTEM"));

  const changedFields = useRef(new Set<string>());
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (submitted: EditValues) => {
      const values: EditValues = {};
      if (!record || changedFields.current.has("name")) values.name = submitted.name ?? "";
      if (!record || changedFields.current.has("code")) values.code = submitted.code ?? "";
      if (!record) values.type = submitted.type ?? "";
      if (!record) values.tenantId = submitted.tenantId ?? 0;
      if (!record || changedFields.current.has("status")) values.status = submitted.status ?? "";
      if (!record || changedFields.current.has("sortOrder"))
        values.sortOrder = submitted.sortOrder ?? 0;
      if (!record || changedFields.current.has("description"))
        values.description = submitted.description ?? "";
      if (!record || changedFields.current.has("permissions"))
        values.permissions = submitted.permissions ?? [];

      if (record && Object.keys(values).length === 0) return;
      await saveManagement("roles", { id: record?.id, values: values });
    },
    meta: { feedback: { channel: "message", action: "保存角色" } },
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
    <Modal
      visible
      title={record ? "编辑角色" : "新建角色"}
      onCancel={onCancel}
      onOk={submit}
      okText="保存"
      confirmLoading={mutation.isPending}
      cancelButtonProps={{ disabled: mutation.isPending }}
      closable={!mutation.isPending}
      escToExit={!mutation.isPending}
      maskClosable={false}
      style={{ width: 680 }}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={initial}
        onValuesChange={(changed) => {
          Object.keys(changed).forEach((key) => changedFields.current.add(key));
          if ("type" in changed) {
            setRoleType(String(changed.type));
            form.setFieldValue("tenantId", 0);
          }
        }}
      >
        <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
          <Form.Item field="name" label="名称" rules={[{ required: true, message: "请填写名称" }]}>
            <Input />
          </Form.Item>
          <Form.Item field="code" label="编码" rules={[{ required: true, message: "请填写编码" }]}>
            <Input />
          </Form.Item>
          <Form.Item
            field="type"
            label="角色类型"
            rules={[{ required: true, message: "请填写角色类型" }]}
          >
            <Select
              options={[
                { value: "SYSTEM", label: "系统角色" },
                { value: "TEMPLATE", label: "角色模板" },
                { value: "TENANT", label: "租户角色" },
              ]}
              disabled={!!record}
            />
          </Form.Item>
          <Form.Item
            field="tenantId"
            label="所属租户"
            rules={[
              { required: true, message: "请填写所属租户" },
              {
                validator: (value: unknown, callback: (message?: string) => void) => {
                  if (roleType === "TENANT" && !value) callback("租户角色必须选择租户");
                  else callback();
                },
              },
            ]}
          >
            <ManagementRelationSelect
              resource="tenants"
              includePlatform={roleType !== "TENANT"}
              disabled={!!record || roleType !== "TENANT"}
            />
          </Form.Item>
          <Form.Item
            field="status"
            label="状态"
            rules={[{ required: true, message: "请填写状态" }]}
          >
            <Select
              options={[
                { value: "ON", label: "启用" },
                { value: "OFF", label: "禁用" },
              ]}
            />
          </Form.Item>
          <Form.Item field="sortOrder" label="排序">
            <InputNumber min={0} precision={0} />
          </Form.Item>
          <Form.Item field="description" label="说明" className="md:col-span-2">
            <Input.TextArea />
          </Form.Item>
          <Form.Item field="permissions" label="权限点" className="md:col-span-2">
            <ManagementRelationSelect resource="permissions" multiple />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}
