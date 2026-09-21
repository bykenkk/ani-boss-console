import { createFileRoute } from "@tanstack/react-router";
import { TenantPlanDetailPage } from "@/components/tenant/TenantPlanDetailPage";

export const Route = createFileRoute("/tenants-quotas/$planCode")({
  component: function TenantPlanDetailRoute() {
    const { planCode } = Route.useParams();
    return <TenantPlanDetailPage planId={planCode} />;
  },
});
