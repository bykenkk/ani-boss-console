import type { AuditLog } from "@/api/audit-logs";
import { StatusBadge } from "@/components/common";
import { loginStatusLabels } from "../AuditLogsList/constants";

interface AuditResultProps {
  item: AuditLog;
}

export function AuditResult({ item }: AuditResultProps) {
  if ("status" in item && item.status) {
    const status = item.status;
    return (
      <StatusBadge
        value={loginStatusLabels[status] ?? status}
        tone={
          status === "SUCCESS"
            ? "success"
            : status === "FAILED" || status === "LOCKED"
              ? "danger"
              : "warning"
        }
      />
    );
  }
  if ("success" in item && item.success !== undefined) {
    return (
      <StatusBadge
        value={item.success ? "成功" : "失败"}
        tone={item.success ? "success" : "danger"}
      />
    );
  }
  return <>-</>;
}
