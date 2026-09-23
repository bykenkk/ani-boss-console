import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/common";

export const Route = createFileRoute("/notify/")({
  component: function NotificationIntegrationsPage() {
    return <PagePlaceholder title="企业通知集成" priority="P1" />;
  },
});
