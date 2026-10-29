import { Modal, Tabs } from "@arco-design/web-react";
import type { ManagedTenant } from "@/api/management";
import { TenantQuotaAccounts } from "./TenantQuotaAccounts";
import { TenantUsageSummary } from "./TenantUsageSummary";

interface TenantUsageModalProps {
  tenant: ManagedTenant;
  onCancel: () => void;
}

export function TenantUsageModal({ tenant, onCancel }: TenantUsageModalProps) {
  return (
    <Modal
      visible
      title={`${tenant.name ?? tenant.id} · 用量与配额`}
      footer={null}
      style={{ width: "85vw" }}
      onCancel={onCancel}
    >
      <Tabs defaultActiveTab="usage">
        <Tabs.TabPane key="usage" title="用量与套餐上限">
          <TenantUsageSummary tenantId={tenant.id} />
        </Tabs.TabPane>
        <Tabs.TabPane key="accounts" title="配额账户">
          <TenantQuotaAccounts tenantId={tenant.id} />
        </Tabs.TabPane>
      </Tabs>
    </Modal>
  );
}
