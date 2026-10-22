import type { TenantAdministratorStatus } from "@/api/tenant";
import { StatusBadge, type StatusBadgeTone } from "@/components/common";

interface TenantAdministratorStatusBadgeProps {
  status: TenantAdministratorStatus;
}

const statusMeta: Record<TenantAdministratorStatus, { label: string; tone: StatusBadgeTone }> = {
  active: { label: "活跃", tone: "success" },
  disabled: { label: "已禁用", tone: "default" },
};

export function TenantAdministratorStatusBadge({ status }: TenantAdministratorStatusBadgeProps) {
  const meta = statusMeta[status];
  return <StatusBadge tone={meta.tone} value={meta.label} />;
}
