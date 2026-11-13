import { createFileRoute } from "@tanstack/react-router";
import { TenantDetailPage } from "@/components/tenant/TenantDetailPage";

export const Route = createFileRoute("/tenants/$tenantId")({
  params: {
    parse: ({ tenantId }) => {
      const id = Number(tenantId);
      if (!/^[1-9]\d*$/.test(tenantId) || !Number.isInteger(id) || id > 4294967295)
        throw new Error("租户定位参数无效");
      return { tenantId: id };
    },
    stringify: ({ tenantId }) => ({ tenantId: String(tenantId) }),
  },
  component: function TenantDetailRoute() {
    const { tenantId } = Route.useParams();
    const navigate = Route.useNavigate();
    return (
      <TenantDetailPage
        key={tenantId}
        tenantId={tenantId}
        onBack={() => navigate({ to: "/tenants" })}
      />
    );
  },
  errorComponent: () => <p>租户定位参数无效，请从租户列表重新进入。</p>,
});
