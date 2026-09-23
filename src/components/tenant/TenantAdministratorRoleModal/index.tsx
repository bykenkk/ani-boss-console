import { Form, Modal, Select } from "@arco-design/web-react";
import { useState } from "react";
import type { TenantRoleDefinition } from "@/api/tenant";
import { tenantAdministratorRoleLabels } from "@/components/tenant/apiModel";

interface TenantAdministratorRoleModalProps {
  loading: boolean;
  onCancel: () => void;

  roles: TenantRoleDefinition[];
  currentRole: string;
  onSubmit: (roleId: string) => void;
}

export function TenantAdministratorRoleModal({
  roles,
  currentRole,
  loading,
  onCancel,
  onSubmit,
}: TenantAdministratorRoleModalProps) {
  const initialRole = roles.find((role) => role.name === currentRole)?.id ?? roles[0]?.id ?? "";
  const [roleId, setRoleId] = useState(initialRole);

  return (
    <Modal
      title="修改管理员角色"
      visible
      okText="保存角色"
      confirmLoading={loading}
      okButtonProps={{ disabled: !roleId }}
      onOk={() => {
        if (roleId) onSubmit(roleId);
      }}
      onCancel={onCancel}
    >
      <Form layout="vertical">
        <Form.Item label="角色" required>
          <Select
            value={roleId}
            options={roles.map((role) => ({
              label: tenantAdministratorRoleLabels[role.name],
              value: role.id,
            }))}
            onChange={setRoleId}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
