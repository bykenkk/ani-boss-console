import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/cluster-nodes")({ component: Outlet });
