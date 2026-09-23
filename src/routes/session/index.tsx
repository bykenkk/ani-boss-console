import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/common";

export const Route = createFileRoute("/session/")({
  component: function SessionSecurityPage() {
    return <PagePlaceholder title="会话与安全策略（预留）" priority="P2" />;
  },
});
