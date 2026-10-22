import { Drawer } from "@arco-design/web-react";
import { useState } from "react";
import type { Plan } from "@/api/plans";
import { PlanQuotaList } from "./PlanQuotaList";

interface PlanQuotasDrawerProps {
  plan: Plan;
  onCancel: () => void;
}

export function PlanQuotasDrawer({ plan, onCancel }: PlanQuotasDrawerProps) {
  const [childModalOpen, setChildModalOpen] = useState(false);
  return (
    <Drawer
      visible
      title={`${plan.name ?? plan.id} · 套餐配额`}
      footer={null}
      placement="right"
      width="min(900px, 100vw)"
      escToExit={!childModalOpen}
      closable={!childModalOpen}
      onCancel={onCancel}
    >
      <PlanQuotaList planId={plan.id} onModalVisibilityChange={setChildModalOpen} />
    </Drawer>
  );
}
