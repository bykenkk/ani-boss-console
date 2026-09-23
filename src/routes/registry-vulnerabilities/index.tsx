import { createFileRoute } from "@tanstack/react-router";
import { RegistryVulnerabilityPage } from "@/components/infrastructure/RegistryOperations/RegistryVulnerabilityPage";

export const Route = createFileRoute("/registry-vulnerabilities/")({
  component: RegistryVulnerabilityPage,
});
