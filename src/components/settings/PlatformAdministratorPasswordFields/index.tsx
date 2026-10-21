import { Form, Input } from "@arco-design/web-react";
import type { FormInstance } from "@arco-design/web-react";
interface PlatformAdministratorPasswordFieldsProps {
  form: FormInstance;
  creating?: boolean;
}
export function PlatformAdministratorPasswordFields({
  form,
  creating = false,
}: PlatformAdministratorPasswordFieldsProps) {
  const field = creating ? "password" : "newPassword";
  return (
    <>
      <Form.Item
        label={creating ? "初始密码" : "新密码"}
        field={field}
        rules={[
          { required: true, message: "请输入密码" },
          { minLength: 8, maxLength: 64, message: "密码长度需为 8 至 64 个字符" },
          {
            validator: (value, callback) => {
              const groups = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) =>
                pattern.test(value ?? ""),
              ).length;
              callback(
                !value || groups >= 3 ? undefined : "需包含大小写字母、数字、特殊字符中的至少三类",
              );
            },
          },
        ]}
      >
        <Input.Password autoComplete="new-password" />
      </Form.Item>
      <Form.Item
        label="确认密码"
        field="confirmPassword"
        dependencies={[field]}
        rules={[
          { required: true, message: "请再次输入密码" },
          {
            validator: (value, callback) =>
              callback(value === form.getFieldValue(field) ? undefined : "两次密码不一致"),
          },
        ]}
      >
        <Input.Password autoComplete="new-password" />
      </Form.Item>
    </>
  );
}
