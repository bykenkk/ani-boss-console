import { Modal } from "@arco-design/web-react";
import type { ManagedTenant } from "@/api/management";
import { ManagedTenantDetails } from "../ManagedTenantDetails";
export function TenantDetailsModal({
  tenant,
  onCancel,
}: {
  tenant: ManagedTenant;
  onCancel: () => void;
}) {
  return (
    <Modal
      visible
      title={tenant.name ?? "租户详情"}
      footer={null}
      style={{ width: "85vw" }}
      onCancel={onCancel}
    >
      <ManagedTenantDetails tenantId={tenant.id} />
    </Modal>
  );
}
