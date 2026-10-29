import { createFileRoute } from "@tanstack/react-router";
import { PlatformAlertsPage } from "@/components/overview/PlatformAlertsPage";
export const Route = createFileRoute("/overview-alerts/")({
  component: PlatformAlertsPage,
});
