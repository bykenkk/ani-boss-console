import { createFileRoute } from "@tanstack/react-router";
import { TenantPlansPage } from "@/components/tenant/TenantPlansPage";

export const Route = createFileRoute("/tenants-quotas/")({
  component: TenantPlansPage,
});
