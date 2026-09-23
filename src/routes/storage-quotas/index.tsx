import { createFileRoute } from "@tanstack/react-router";
import { TenantStorageQuotaPage } from "@/components/infrastructure/TenantStorageQuotaPage";

export const Route = createFileRoute("/storage-quotas/")({
  component: TenantStorageQuotaPage,
});
