import { createFileRoute } from "@tanstack/react-router";
import { GpuResourcesPage } from "@/components/gpu/GpuResourcesPage";
export const Route = createFileRoute("/gpu/")({ component: GpuResourcesPage });
