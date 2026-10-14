import { Modal } from "@arco-design/web-react";
import type { ManagedPlan } from "@/api/management";
import { PlanQuotaList } from "./PlanQuotaList";
export function PlanQuotasModal({ plan, onCancel }: { plan: ManagedPlan; onCancel: () => void }) {
  return (
    <Modal
      visible
      title={`${plan.name} · 套餐配额`}
      footer={null}
      style={{ width: "85vw" }}
      onCancel={onCancel}
    >
      <PlanQuotaList planId={plan.id} />
    </Modal>
  );
}
