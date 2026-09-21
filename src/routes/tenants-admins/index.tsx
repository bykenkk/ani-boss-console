import { createFileRoute } from "@tanstack/react-router";
import { TenantAdministratorListPage } from "@/components/tenant/TenantAdministratorListPage";

export const Route = createFileRoute("/tenants-admins/")({
  component: TenantAdministratorListPage,
});
