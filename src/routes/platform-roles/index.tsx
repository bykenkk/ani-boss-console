import { createFileRoute } from "@tanstack/react-router";
import { PlatformRolesPage } from "@/components/settings/PlatformRolesPage";

export const Route = createFileRoute("/platform-roles/")({
  component: PlatformRolesPage,
});
