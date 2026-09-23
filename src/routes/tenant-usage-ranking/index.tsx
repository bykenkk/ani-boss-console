import { createFileRoute } from "@tanstack/react-router";
import { TenantUsageRankingPage } from "@/components/metering/TenantUsageRankingPage";

export const Route = createFileRoute("/tenant-usage-ranking/")({
  component: () => <TenantUsageRankingPage />,
});
