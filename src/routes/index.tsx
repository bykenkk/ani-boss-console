import { createFileRoute } from "@tanstack/react-router";
import { PlatformOverviewPage } from "@/components/overview/PlatformOverviewPage";

export const Route = createFileRoute("/")({
  component: () => <PlatformOverviewPage />,
});
