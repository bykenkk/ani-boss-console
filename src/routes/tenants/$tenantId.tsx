import { createFileRoute } from "@tanstack/react-router";
import { TenantDetailPage } from "@/components/tenant/TenantDetailPage";

export const Route = createFileRoute("/tenants/$tenantId")({
  component: function TenantDetailRoute() {
    const { tenantId } = Route.useParams();
    return <TenantDetailPage tenantId={tenantId} />;
  },
});
