import { Form, Select } from "@arco-design/web-react";
import type { TenantRoleDefinition } from "@/api/tenant";
import { tenantAdministratorRoleLabels } from "./labels";

interface TenantAdministratorRoleFieldsProps {
  roles: TenantRoleDefinition[];
}
export function TenantAdministratorRoleFields({ roles }: TenantAdministratorRoleFieldsProps) {
  return (
    <Form.Item label="角色" field="roleId" rules={[{ required: true, message: "请选择角色" }]}>
      <Select
        options={roles.map((role) => ({
          label: tenantAdministratorRoleLabels[role.name],
          value: role.id,
        }))}
      />
    </Form.Item>
  );
}
