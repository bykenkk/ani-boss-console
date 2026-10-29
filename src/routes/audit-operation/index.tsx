import { createFileRoute } from "@tanstack/react-router";
import { AuditLogsList } from "@/components/audit/AuditLogsList";

export const Route = createFileRoute("/audit-operation/")({
  component: function OperationAuditPage() {
    return <AuditLogsList kind="operation" />;
  },
});
