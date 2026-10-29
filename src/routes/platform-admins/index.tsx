import { createFileRoute } from "@tanstack/react-router";
import { UsersPage } from "@/components/management/UsersPage";

export const Route = createFileRoute("/platform-admins/")({
  component: () => <UsersPage scope="platform" />,
});
