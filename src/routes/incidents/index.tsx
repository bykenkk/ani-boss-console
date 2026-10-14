import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/common";

export const Route = createFileRoute("/incidents/")({
  component: () => {
    return <PagePlaceholder title="故障处理" priority="P1" />;
  },
});
