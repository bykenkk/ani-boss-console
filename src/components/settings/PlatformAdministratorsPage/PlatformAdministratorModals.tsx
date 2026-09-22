import { Form, Input, Modal, Select } from "@arco-design/web-react";
import { useEffect, type ReactNode } from "react";
import type {
  CreatePlatformAdministratorInput,
  PlatformAdministratorListItem,
  PlatformAdministratorRole,
  PlatformAdministratorRoleDefinition,
} from "@/api/platform-admins";
import { validateForm } from "@/lib/form";
import { platformAdministratorRoleLabels } from "../model";

interface CreateFormValues extends CreatePlatformAdministratorInput {
  confirmPassword: string;
}

interface PasswordFormValues {
  newPassword: string;
  confirmPassword: string;
}

interface RoleFormValues {
  roleId: string;
}

const fallbackRoles = Object.entries(platformAdministratorRoleLabels).map(([value, label]) => ({
  value: value as PlatformAdministratorRole,
  label,
}));

function passwordStrengthValidator(
  value: string | undefined,
  callback: (error?: ReactNode) => void,
) {
  if (!value) {
    callback();
    return;
  }
  const groups = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) =>
    pattern.test(value),
  ).length;
  callback(groups >= 3 ? undefined : "需包含大小写字母、数字、特殊字符中的至少三类");
}

function roleOptions(roles: PlatformAdministratorRoleDefinition[]) {
  const rolesByName = new Map(roles.map((role) => [role.name, role]));

  return fallbackRoles.flatMap((fallbackRole) => {
    const roleId = rolesByName.get(fallbackRole.value)?.id?.trim();
    return roleId ? [{ value: roleId, label: fallbackRole.label }] : [];
  });
}

export function PlatformAdministratorCreateModal({
  visible,
  loading,
  roles,
  onCancel,
  onSubmit,
}: {
  visible: boolean;
  loading: boolean;
  roles: PlatformAdministratorRoleDefinition[];
  onCancel: () => void;
  onSubmit: (input: CreatePlatformAdministratorInput) => void;
}) {
  const [form] = Form.useForm<CreateFormValues>();
  const options = roleOptions(roles);

  useEffect(() => {
    if (!visible || form.getFieldValue("roleId")) return;
    const defaultRole = roles.find((role) => role.name === "platform-ops") || roles[0];
    if (defaultRole?.id) form.setFieldsValue({ roleId: defaultRole.id });
  }, [form, roles, visible]);

  const submit = async () => {
    const { confirmPassword: _confirmPassword, ...values } =
      await validateForm<CreateFormValues>(form);
    onSubmit(values);
  };

  return (
    <Modal
      title="新建平台运营账号"
      visible={visible}
      confirmLoading={loading}
      onOk={submit}
      onCancel={onCancel}
      afterClose={() => form.resetFields()}
      unmountOnExit={false}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="邮箱"
          field="email"
          rules={[{ required: true, type: "email", message: "请输入有效邮箱" }]}
        >
          <Input placeholder="name@example.com" autoComplete="off" />
        </Form.Item>
        <Form.Item
          label="用户名"
          field="username"
          rules={[
            { required: true, message: "请输入用户名" },
            { maxLength: 64, message: "用户名最多 64 个字符" },
            { match: /^[^:]+$/, message: "用户名不能包含冒号" },
          ]}
        >
          <Input placeholder="例如 zhang.san" autoComplete="off" />
        </Form.Item>
        <Form.Item
          label="显示名称"
          field="displayName"
          rules={[
            { required: true, message: "请输入显示名称" },
            { maxLength: 128, message: "显示名称最多 128 个字符" },
          ]}
        >
          <Input placeholder="例如 张三" />
        </Form.Item>
        <Form.Item label="角色" field="roleId" rules={[{ required: true, message: "请选择角色" }]}>
          <Select options={options} placeholder={options.length ? "请选择角色" : "暂无可用角色"} />
        </Form.Item>
        <Form.Item
          label="初始密码"
          field="password"
          rules={[
            { required: true, message: "请输入初始密码" },
            { minLength: 8, maxLength: 64, message: "密码长度需为 8 至 64 个字符" },
            { validator: passwordStrengthValidator },
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          label="确认密码"
          field="confirmPassword"
          rules={[
            { required: true, message: "请再次输入密码" },
            {
              validator: (value, callback) =>
                callback(value === form.getFieldValue("password") ? undefined : "两次密码不一致"),
            },
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export function PlatformAdministratorRoleModal({
  target,
  loading,
  roles,
  onCancel,
  onSubmit,
}: {
  target: PlatformAdministratorListItem | null;
  loading: boolean;
  roles: PlatformAdministratorRoleDefinition[];
  onCancel: () => void;
  onSubmit: (roleId: string) => void;
}) {
  const [form] = Form.useForm<RoleFormValues>();
  const options = roleOptions(roles);

  useEffect(() => {
    if (!target) return;
    const currentRoleId = roles.find((role) => role.name === target.role)?.id;
    form.setFieldsValue({ roleId: currentRoleId });
  }, [form, roles, target]);

  return (
    <Modal
      title={`修改角色${target ? `：${target.displayName}` : ""}`}
      visible={Boolean(target)}
      confirmLoading={loading}
      mountOnEnter={false}
      afterClose={() => form.resetFields()}
      onCancel={onCancel}
      onOk={async () => {
        const { roleId } = await validateForm<RoleFormValues>(form);
        onSubmit(roleId);
      }}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="平台角色"
          field="roleId"
          rules={[{ required: true, message: "请选择角色" }]}
        >
          <Select options={options} placeholder={options.length ? "请选择角色" : "暂无可用角色"} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export function PlatformAdministratorPasswordModal({
  target,
  loading,
  onCancel,
  onSubmit,
}: {
  target: PlatformAdministratorListItem | null;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (password: string) => void;
}) {
  const [form] = Form.useForm<PasswordFormValues>();

  return (
    <Modal
      title={`重置密码${target ? `：${target.displayName}` : ""}`}
      visible={Boolean(target)}
      confirmLoading={loading}
      afterClose={() => form.resetFields()}
      onCancel={onCancel}
      onOk={async () => {
        const { newPassword } = await validateForm<PasswordFormValues>(form);
        onSubmit(newPassword);
      }}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="新密码"
          field="newPassword"
          rules={[
            { required: true, message: "请输入新密码" },
            { minLength: 8, maxLength: 64, message: "密码长度需为 8 至 64 个字符" },
            { validator: passwordStrengthValidator },
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          label="确认密码"
          field="confirmPassword"
          rules={[
            { required: true, message: "请再次输入新密码" },
            {
              validator: (value, callback) =>
                callback(
                  value === form.getFieldValue("newPassword") ? undefined : "两次密码不一致",
                ),
            },
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
