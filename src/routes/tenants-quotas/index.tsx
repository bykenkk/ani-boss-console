import { createFileRoute } from "@tanstack/react-router";
import { TenantPlansPages } from "@/components/tenant/TenantPlansPages";

export const Route = createFileRoute("/tenants-quotas/")({
  component: TenantPlansPages,
});
