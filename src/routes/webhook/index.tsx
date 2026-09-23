import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/common";

export const Route = createFileRoute("/webhook/")({
  component: () => <PagePlaceholder title="运维 Webhook" priority="P0" />,
});
