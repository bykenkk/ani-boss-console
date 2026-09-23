import { createFileRoute } from "@tanstack/react-router";
import { GpuQuotaPage } from "@/components/gpu-resource-pool/GpuQuotaPage";

export const Route = createFileRoute("/ops-gpu-quotas/")({
  component: GpuQuotaPage,
});
