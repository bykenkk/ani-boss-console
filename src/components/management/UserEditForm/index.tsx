import { Form, Input, Radio, type FormInstance } from "@arco-design/web-react";
import type { ManagedUser } from "@/api/management";
import { TenantSelect } from "@/components/tenant/TenantSelect";
import { RoleSelect } from "@/components/management/RoleSelect";

export type UserScope = "platform" | "tenant";

export interface UserEditFormValues {
  tenantId?: number;
  username?: string;
  password?: string;
  roleIds?: number[];
  nickname?: string;
  realname?: string;
  email?: string;
  mobile?: string;
  status?: ManagedUser["status"];
}

interface UserEditFormProps {
  form: FormInstance<UserEditFormValues>;
  mode: "create" | "edit";
  userScope: UserScope;
  initialValues: UserEditFormValues;
  disabled: boolean;
  onValuesChange?: (changed: Partial<UserEditFormValues>) => void;
}

export function UserEditForm({
  form,
  mode,
  userScope,
  initialValues,
  disabled,
  onValuesChange,
}: UserEditFormProps) {
  const editing = mode === "edit";
  return (
    <Form
      form={form}
      disabled={disabled}
      layout="vertical"
      initialValues={initialValues}
      onValuesChange={onValuesChange}
    >
      {userScope === "tenant" && (
        <Form.Item
          field="tenantId"
          label="所属租户"
          rules={[{ required: true, message: "请填写所属租户" }]}
        >
          <TenantSelect
            onChange={() => {
              form.setFieldValue("roleIds", []);
            }}
            disabled={disabled || editing}
          />
        </Form.Item>
      )}
      <Form.Item
        field="username"
        label="用户名"
        rules={[{ required: true, message: "请填写用户名" }]}
      >
        <Input disabled={disabled || editing} />
      </Form.Item>
      {!editing && (
        <Form.Item
          field="password"
          label="密码"
          rules={[{ required: true, message: "请填写密码" }]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
      )}
      <Form.Item noStyle shouldUpdate>
        {(values: UserEditFormValues) => (
          <Form.Item
            field="roleIds"
            label="角色"
            rules={[{ required: true, message: "请填写角色" }]}
          >
            <RoleSelect
              multiple
              tenantId={Number(values.tenantId ?? 0)}
              disabled={disabled || (userScope === "tenant" && !values.tenantId)}
            />
          </Form.Item>
        )}
      </Form.Item>
      <Form.Item field="nickname" label="昵称">
        <Input />
      </Form.Item>
      <Form.Item field="realname" label="真实姓名">
        <Input />
      </Form.Item>
      <Form.Item field="email" label="邮箱" rules={[{ type: "email", message: "请输入有效邮箱" }]}>
        <Input />
      </Form.Item>
      <Form.Item field="mobile" label="手机号">
        <Input />
      </Form.Item>
      <Form.Item field="status" label="状态" rules={[{ required: true, message: "请填写状态" }]}>
        <Radio.Group
          type="button"
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
    </Form>
  );
}
