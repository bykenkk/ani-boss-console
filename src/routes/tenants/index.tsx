import { createFileRoute } from "@tanstack/react-router";
import { TenantListPage } from "@/components/tenant/TenantListPage";

export const Route = createFileRoute("/tenants/")({
  component: TenantListPage,
});
