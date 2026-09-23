import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/common";

export const Route = createFileRoute("/jobs/")({
  component: function MaintenanceJobsPage() {
    return <PagePlaceholder title="任务历史" priority="P1" />;
  },
});
