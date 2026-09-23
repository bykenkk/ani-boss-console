import { createFileRoute } from "@tanstack/react-router";
import { PlatformLogsPage } from "@/components/observability/PlatformLogsPage";

interface HealthLogsSearch {
  component?: string;
}

export const Route = createFileRoute("/logs/")({
  validateSearch: (search): HealthLogsSearch => ({
    component:
      typeof search.component === "string" && search.component.trim()
        ? search.component.trim()
        : undefined,
  }),
  component: function HealthLogsRouteComponent() {
    const { component } = Route.useSearch();
    return <PlatformLogsPage initialComponent={component} />;
  },
});
