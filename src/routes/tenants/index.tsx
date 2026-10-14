import { createFileRoute } from "@tanstack/react-router";
import { TenantsPage } from "@/components/tenant/TenantsPage";

export const Route = createFileRoute("/tenants/")({
  component: TenantsPage,
});
