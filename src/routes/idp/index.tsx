import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/common";

export const Route = createFileRoute("/idp/")({
  component: function IdentityProviderPage() {
    return <PagePlaceholder title="登录与 IdP（预留）" priority="P1" />;
  },
});
