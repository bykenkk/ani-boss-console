import { createFileRoute } from "@tanstack/react-router";
import { AuditLogsList } from "@/components/audit/AuditLogsList";

export const Route = createFileRoute("/audit-login/")({
  component: function LoginAuditPage() {
    return <AuditLogsList kind="login" />;
  },
});
