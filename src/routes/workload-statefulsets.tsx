import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/workload-statefulsets")({ component: Outlet });
