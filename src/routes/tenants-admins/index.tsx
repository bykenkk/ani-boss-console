import { createFileRoute } from "@tanstack/react-router";
import { TenantAdministratorsPages } from "@/components/tenant/TenantAdministratorsPages";

export const Route = createFileRoute("/tenants-admins/")({
  component: TenantAdministratorsPages,
});
