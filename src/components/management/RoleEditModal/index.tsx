import { Form, Modal, Input, Select, InputNumber, Switch } from "@arco-design/web-react";
import { useEffect, useMemo, useRef, useState } from "react";
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

import { TenantSelect } from "@/components/tenant/TenantSelect";
import { PermissionTreeSelect } from "../PermissionTreeSelect";

interface Props {
  record?: ResourceRecords["roles"];
  onCancel: () => void;
  onSuccess: () => void;
}
export function RoleEditModal(props: Props) {
  const { record } = props;
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
  return (
    <RoleEditForm
      key={record?.id ?? "create"}
      {...props}
      record={detail.data ?? record}
      loading={!!record && detail.isPending}
      disabled={!!record && !detail.data}
    />
  );
}
interface RoleEditFormProps extends Props {
  loading: boolean;
  disabled: boolean;
}

function RoleEditForm({ record, onCancel, onSuccess, loading, disabled }: RoleEditFormProps) {
  const [form] = Form.useForm<EditValues>();
  const initial = useMemo(() => {
    const values: EditValues = {
      ...(!record
        ? {
            type: "SYSTEM",
            tenantId: 0,
            status: "ON",
            sortOrder: 1,
            permissions: [],
          }
        : {}),
      ...record,
    };
    return values;
  }, [record]);
  const [roleType, setRoleType] = useState(String(initial.type ?? "SYSTEM"));

  const changedFields = useRef(new Set<string>());
  const detailInitialized = useRef(!disabled);
  useEffect(() => {
    if (disabled || detailInitialized.current) return;
    form.setFieldsValue(initial);
    changedFields.current.clear();
    setRoleType(String(initial.type ?? "SYSTEM"));
    detailInitialized.current = true;
  }, [disabled, form, initial]);
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (submitted: EditValues) => {
      // 数据权限范围暂未开放配置，新建和编辑统一提交 ALL。
      const values: EditValues = { dataScope: "ALL" };
      if (!record || changedFields.current.has("name")) values.name = submitted.name ?? "";
      if (!record || changedFields.current.has("code")) values.code = submitted.code ?? "";
      if (!record) values.type = submitted.type ?? "";
      if (!record) values.tenantId = submitted.type === "TENANT" ? (submitted.tenantId ?? 0) : 0;
      if (!record || changedFields.current.has("status")) values.status = submitted.status ?? "";
      if (!record || changedFields.current.has("sortOrder"))
        values.sortOrder = submitted.sortOrder ?? 1;
      if (!record || changedFields.current.has("description"))
        values.description = submitted.description ?? "";
      if (!record || changedFields.current.has("permissions"))
        values.permissions = submitted.permissions ?? [];

      await saveManagement("roles", { id: record?.id, values: values });
    },
    meta: { feedback: { channel: "message", action: "保存角色" } },
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
      title={record ? "编辑角色" : "新建角色"}
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
          label="角色名称"
          rules={[{ required: true, message: "请填写角色名称" }]}
        >
          <Input placeholder="请输入" allowClear />
        </Form.Item>
        <Form.Item
          field="code"
          label="角色编码"
          rules={[{ required: true, message: "请填写角色编码" }]}
        >
          <Input placeholder="请输入" allowClear disabled={!!record?.isProtected} />
        </Form.Item>
        <Form.Item
          field="type"
          label="角色类型"
          rules={[{ required: true, message: "请填写角色类型" }]}
        >
          <Select
            onChange={(type) => {
              setRoleType(type);
              form.setFieldValue("tenantId", type === "TENANT" ? undefined : 0);
            }}
            options={[
              { value: "SYSTEM", label: "系统角色" },
              { value: "TEMPLATE", label: "角色模板" },
              { value: "TENANT", label: "租户角色" },
            ]}
            disabled={!!record}
          />
        </Form.Item>
        {roleType === "TENANT" && (
          <Form.Item
            field="tenantId"
            label="所属租户"
            rules={[
              { required: true, message: "请选择所属租户" },
              {
                validator: (value: unknown, callback: (message?: string) => void) => {
                  if (!value) callback("租户角色必须选择租户");
                  else callback();
                },
              },
            ]}
          >
            <TenantSelect disabled={!!record} />
          </Form.Item>
        )}
        <Form.Item
          field="status"
          label="状态"
          triggerPropName="checked"
          formatter={(value) => value === "ON"}
          normalize={(checked) => (checked ? "ON" : "OFF")}
          rules={[{ required: true, message: "请填写状态" }]}
        >
          <Switch checkedText="启用" uncheckedText="禁用" disabled={!!record?.isProtected} />
        </Form.Item>
        <Form.Item
          field="sortOrder"
          label="排序"
          rules={[{ required: true, message: "请填写排序" }]}
        >
          <InputNumber min={0} precision={0} placeholder="请输入" />
        </Form.Item>
        <Form.Item field="description" label="描述">
          <Input.TextArea placeholder="请输入" />
        </Form.Item>
        <Form.Item field="permissions" label="权限配置">
          <PermissionTreeSelect />
        </Form.Item>
      </Form>
    </Modal>
  );
}
