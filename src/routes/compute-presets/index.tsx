import { createFileRoute } from "@tanstack/react-router";
import { ComputePresetsPage } from "@/components/compute/ComputePresetsPage";
export const Route = createFileRoute("/compute-presets/")({ component: ComputePresetsPage });
