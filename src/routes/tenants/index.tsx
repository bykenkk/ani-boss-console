import { createFileRoute } from "@tanstack/react-router";
import { TenantsPage } from "@/components/tenant/TenantsPage";

export const Route = createFileRoute("/tenants/")({
  component: function TenantListRoute() {
    const navigate = Route.useNavigate();
    return (
      <TenantsPage
        onOpenTenant={(tenantId) => {
          navigate({ to: "/tenants/$tenantId", params: { tenantId } });
        }}
      />
    );
  },
});
