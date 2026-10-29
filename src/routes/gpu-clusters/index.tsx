import { createFileRoute } from "@tanstack/react-router";
import { GpuClustersPage } from "@/components/gpu/GpuClustersPage";
export const Route = createFileRoute("/gpu-clusters/")({ component: GpuClustersPage });
