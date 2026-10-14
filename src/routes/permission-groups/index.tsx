import { createFileRoute } from "@tanstack/react-router";
import { PermissionGroupsPage } from "@/components/management/PermissionGroupsPage";

export const Route = createFileRoute("/permission-groups/")({ component: PermissionGroupsPage });
