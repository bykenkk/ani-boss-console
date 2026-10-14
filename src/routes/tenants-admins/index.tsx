import { createFileRoute } from "@tanstack/react-router";
import { UsersPage } from "@/components/management/UsersPage";

export const Route = createFileRoute("/tenants-admins/")({
  component: () => <UsersPage scope="tenant" />,
});
