import { createFileRoute } from "@tanstack/react-router";
import { PlansPage } from "@/components/tenant/PlansPage";
export const Route = createFileRoute("/tenant-plans/")({ component: PlansPage });
