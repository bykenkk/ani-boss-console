import { createFileRoute } from "@tanstack/react-router";
import { TenantPlanListPage } from "@/components/tenant/TenantPlanListPage";

export const Route = createFileRoute("/tenants-quotas/")({
  component: TenantPlanListPage,
});
