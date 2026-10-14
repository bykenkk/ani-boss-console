import { createFileRoute } from "@tanstack/react-router";
import { PermissionsPage } from "@/components/management/PermissionsPage";
export const Route = createFileRoute("/permissions/")({ component: PermissionsPage });
