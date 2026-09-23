import { createFileRoute } from "@tanstack/react-router";
import { NetworkInfrastructurePage } from "@/components/infrastructure/NetworkInfrastructurePage";

export const Route = createFileRoute("/network/")({
  component: NetworkInfrastructurePage,
});
