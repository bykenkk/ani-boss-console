import { createFileRoute } from "@tanstack/react-router";
import { PlatformAdministratorsPage } from "@/components/settings/PlatformAdministratorsPage";

export const Route = createFileRoute("/platform-admins/")({
  component: PlatformAdministratorsPage,
});
