import { createFileRoute } from "@tanstack/react-router";
import { TenantAdministratorDetailPage } from "@/components/tenant/TenantAdministratorDetailPage";

export const Route = createFileRoute("/tenants-admins/$adminId")({
  component: function TenantAdministratorDetailRoute() {
    const { adminId } = Route.useParams();
    return <TenantAdministratorDetailPage administratorId={adminId} />;
  },
});
