import { StatusBadge, type StatusBadgeTone } from "@/components/common";
import type { PlatformAdministratorStatus } from "@/api/platform-admins";

const statusMeta: Record<PlatformAdministratorStatus, { label: string; tone: StatusBadgeTone }> = {
  active: { label: "活跃", tone: "success" },
  disabled: { label: "已禁用", tone: "default" },
};

export function PlatformAdministratorStatusBadge({
  status,
}: {
  status: PlatformAdministratorStatus;
}) {
  const meta = statusMeta[status];
  return <StatusBadge value={meta.label} tone={meta.tone} />;
}
