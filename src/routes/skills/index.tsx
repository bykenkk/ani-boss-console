import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/common";

export const Route = createFileRoute("/skills/")({
  component: function MaintenanceSkillsPage() {
    return <PagePlaceholder title="运维 Skills" priority="P1" />;
  },
});
