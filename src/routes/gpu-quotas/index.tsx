import { createFileRoute } from "@tanstack/react-router";
import { GpuQuotaPage } from "@/components/gpu/GpuQuotaPage";

export const Route = createFileRoute("/gpu-quotas/")({
  component: GpuQuotaPage,
});
