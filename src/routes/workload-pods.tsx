import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/workload-pods")({ component: Outlet });
