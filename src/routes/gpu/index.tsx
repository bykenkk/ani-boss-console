import { createFileRoute } from "@tanstack/react-router";
import { GpuResourcePoolPage } from "@/components/gpu/GpuResourcePoolPage";

export const Route = createFileRoute("/gpu/")({
  component: GpuResourcePoolPage,
});
