import type { QuotaEnforcement } from "@/api/plans";
import { StatusBadge, type StatusBadgeTone } from "@/components/common";

interface QuotaEnforcementBadgeProps {
  enforcement?: QuotaEnforcement;
}

const enforcementLabels: Record<QuotaEnforcement, string> = {
  ENFORCEMENT_UNSPECIFIED: "未指定",
  LEGACY_CONFIG_ONLY: "仅配置",
  LAB_ONLY: "仅实验",
  ENFORCED: "实际拦截",
  NOT_ENABLED: "未启用",
};

const enforcementTones: Record<QuotaEnforcement, StatusBadgeTone> = {
  ENFORCEMENT_UNSPECIFIED: "default",
  LEGACY_CONFIG_ONLY: "default",
  LAB_ONLY: "warning",
  ENFORCED: "success",
  NOT_ENABLED: "default",
};

export function QuotaEnforcementBadge({ enforcement }: QuotaEnforcementBadgeProps) {
  return (
    <StatusBadge
      value={enforcement ? (enforcementLabels[enforcement] ?? enforcement) : undefined}
      tone={enforcement ? (enforcementTones[enforcement] ?? "default") : "default"}
    />
  );
}
