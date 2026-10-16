import { Form, Modal, Spin, Input, Select } from "@arco-design/web-react";
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
  record?: ResourceRecords["users"];
  defaults?: EditValues;
  userScope?: "all" | "platform" | "tenant";
  onCancel: () => void;
  onSuccess: () => void;
}
export function UserEditModal(props: Props) {
  const { record, onCancel } = props;
  const detail = useQuery({
    queryKey: managementKeys.detail("users", record?.id ?? 0),
    queryFn: ({ signal }) => getManagement("users", record!.id, signal),
    enabled: !!record,
    meta: {
      errorNotification: {
        id: withId("management-detail", "users", record?.id),
        action: "详情加载",
      },
    },
  });
  if (!record || detail.isSuccess) {
    return <UserEditForm {...props} record={detail.data ?? record} />;
  }
  return (
    <Modal
      visible
      title={record ? "编辑用户" : "新建用户"}
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
function UserEditForm({ record, defaults, userScope, onCancel, onSuccess }: Props) {
  const [form] = Form.useForm<EditValues>();
  const initial: EditValues = {
    ...(!record ? { tenantId: 0, roleIds: [], status: "NORMAL" } : {}),
    ...record,
    ...defaults,
  };
  if (record) initial.roleIds = record.roleIds ?? (record.roleId ? [record.roleId] : []);
  if (userScope === "tenant" && !record && !defaults?.tenantId) initial.tenantId = undefined;
  const [tenantId, setTenantId] = useState(Number(initial.tenantId ?? 0));

  const changedFields = useRef(new Set<string>());
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (submitted: EditValues) => {
      const values: EditValues = {};
      if (!record) values.tenantId = submitted.tenantId ?? 0;
      if (!record) values.username = submitted.username ?? "";
      if (!record || changedFields.current.has("realname"))
        values.realname = submitted.realname ?? "";
      if (!record || changedFields.current.has("nickname"))
        values.nickname = submitted.nickname ?? "";
      if (!record || changedFields.current.has("email")) values.email = submitted.email ?? "";
      if (!record || changedFields.current.has("mobile")) values.mobile = submitted.mobile ?? "";
      if (!record || changedFields.current.has("roleIds")) values.roleIds = submitted.roleIds ?? [];
      if (!record || changedFields.current.has("status")) values.status = submitted.status ?? "";
      if (!record) values.password = submitted.password ?? "";

      if (record && Object.keys(values).length === 0) return;
      await saveManagement("users", { id: record?.id, values: values });
    },
    meta: { feedback: { channel: "message", action: "保存用户" } },
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
      title={record ? "编辑用户" : "新建用户"}
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
        disabled={mutation.isPending}
        layout="vertical"
        initialValues={initial}
        onValuesChange={(changed) => {
          Object.keys(changed).forEach((key) => changedFields.current.add(key));
          if ("tenantId" in changed) {
            setTenantId(Number(changed.tenantId ?? 0));
            form.setFieldValue("roleIds", []);
          }
        }}
      >
        <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
          <Form.Item
            field="tenantId"
            label="所属租户"
            rules={[{ required: true, message: "请填写所属租户" }]}
          >
            <ManagementRelationSelect
              resource="tenants"
              includePlatform={userScope !== "tenant"}
              disabled={mutation.isPending || !!record || userScope === "platform"}
            />
          </Form.Item>
          <Form.Item
            field="username"
            label="用户名"
            rules={[{ required: true, message: "请填写用户名" }]}
          >
            <Input disabled={mutation.isPending || !!record} />
          </Form.Item>
          <Form.Item field="realname" label="姓名">
            <Input />
          </Form.Item>
          <Form.Item field="nickname" label="昵称">
            <Input />
          </Form.Item>
          <Form.Item
            field="email"
            label="邮箱"
            rules={[{ type: "email", message: "请输入有效邮箱" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item field="mobile" label="手机号">
            <Input />
          </Form.Item>
          <Form.Item
            field="roleIds"
            label="角色"
            className="md:col-span-2"
            rules={[{ required: true, message: "请填写角色" }]}
          >
            <ManagementRelationSelect
              resource="roles"
              multiple
              userRoles
              tenantId={tenantId}
              disabled={mutation.isPending || (userScope === "tenant" && !tenantId)}
            />
          </Form.Item>
          <Form.Item
            field="status"
            label="状态"
            rules={[{ required: true, message: "请填写状态" }]}
          >
            <Select
              options={[
                { value: "NORMAL", label: "正常" },
                { value: "DISABLED", label: "禁用" },
                { value: "PENDING", label: "待激活" },
                { value: "LOCKED", label: "锁定" },
                { value: "EXPIRED", label: "过期" },
                { value: "CLOSED", label: "注销" },
              ]}
            />
          </Form.Item>
          {!record && (
            <Form.Item
              field="password"
              label="初始密码"
              rules={[{ required: true, message: "请填写初始密码" }]}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>
          )}
        </div>
      </Form>
    </Modal>
  );
}
