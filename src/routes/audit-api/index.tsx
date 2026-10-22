import { createFileRoute } from "@tanstack/react-router";
import { AuditLogsList } from "@/components/audit/AuditLogsList";

export const Route = createFileRoute("/audit-api/")({
  component: function ApiAuditPage() {
    return <AuditLogsList kind="api" />;
  },
});
