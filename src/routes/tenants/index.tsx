import { createFileRoute } from "@tanstack/react-router";
import { TenantsPages } from "@/components/tenant/TenantsPages";

export const Route = createFileRoute("/tenants/")({
  component: TenantsPages,
});
