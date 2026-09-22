import { createFileRoute } from "@tanstack/react-router";
import { PlatformRolesPage } from "@/components/settings/PlatformRolesPage";

export const Route = createFileRoute("/settings-platform-roles/")({
  component: PlatformRolesPage,
});
