import { Form, Modal, Select } from "@arco-design/web-react";
import { useState } from "react";
import type { BoundTenant } from "@/api/tenant";

interface TenantPlanBindModalProps {
  loading: boolean;
  onCancel: () => void;

  tenants: BoundTenant[];
  onSubmit: (tenantId: string) => void;
}

export function TenantPlanBindModal({
  tenants,
  loading,
  onCancel,
  onSubmit,
}: TenantPlanBindModalProps) {
  const [tenantId, setTenantId] = useState(tenants[0]?.id ?? "");

  return (
    <Modal
      title="绑定租户"
      visible
      okText="确认绑定"
      confirmLoading={loading}
      okButtonProps={{ disabled: !tenantId }}
      onOk={() => {
        if (tenantId) onSubmit(tenantId);
      }}
      onCancel={onCancel}
    >
      <Form layout="vertical">
        <Form.Item label="目标租户" required>
          <Select
            value={tenantId}
            options={tenants.map((tenant) => ({
              label: `${tenant.displayName} · ${tenant.name}`,
              value: tenant.id,
            }))}
            onChange={setTenantId}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
